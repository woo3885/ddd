import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  createSessionFrameTransport,
  type SessionFrameTransport,
  type SessionFrameTransportEvent,
  type SessionFrameTransportOptions
} from '@/features/Integration/api/session-frame-transport';
import {
  defaultSessionRestClient,
  type BackendSession,
  type CreateBackendSessionRequest,
  type SessionRestClient
} from '@/features/Integration/api/session-rest-client';
import {
  classifyFrameConnectionClose,
  getFrameReconnectDelay,
  getFrameReconnectMaxAttempts,
  type FrameConnectionClose,
  type FrameReconnectPolicy
} from '@/features/Integration/model/frame-reconnect-policy';
import { sessionFrameReducer } from '@/features/Integration/model/session-frame-reducer';
import {
  canSubmitViewerAction,
  initialSessionFrameState
} from '@/features/Integration/model/session-frame-state';

const SESSION_REQUEST: CreateBackendSessionRequest = {
  userRequest: '계좌 선택 화면을 확인합니다.',
  siteId: 'demo-bank',
  initialPath: '/transfer/accounts'
};

type SessionClient = Pick<SessionRestClient, 'createSession' | 'cancelSession'>;
type TransportFactory = (
  options: SessionFrameTransportOptions
) => SessionFrameTransport;

type ConnectFrameTransport = (runId: number) => void;
type HandleFrameDisconnect = (runId: number, close: FrameConnectionClose) => void;

export interface UseSessionFrameIntegrationOptions {
  sessionClient?: SessionClient;
  transportFactory?: TransportFactory;
  reconnectPolicy?: FrameReconnectPolicy;
}

export function useSessionFrameIntegration(
  options: UseSessionFrameIntegrationOptions = {}
) {
  const sessionClient = options.sessionClient ?? defaultSessionRestClient;
  const transportFactory = options.transportFactory ?? createSessionFrameTransport;
  const reconnectPolicy = options.reconnectPolicy;
  const [state, dispatch] = useReducer(sessionFrameReducer, initialSessionFrameState);
  const runIdRef = useRef(0);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<BackendSession | null>(null);
  const transportRef = useRef<SessionFrameTransport | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const connectionGenerationRef = useRef(0);
  const retryGenerationRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAcceptedSequenceRef = useRef(0);
  const recoveryAttemptRef = useRef(0);
  const recoveryPendingRef = useRef(false);
  const canRetryManuallyRef = useRef(false);
  const manualRetryInFlightRef = useRef(false);
  const connectFrameTransportRef = useRef<ConnectFrameTransport>(() => undefined);
  const handleFrameDisconnectRef = useRef<HandleFrameDisconnect>(() => undefined);

  const clearScheduledRetry = useCallback(() => {
    ++retryGenerationRef.current;
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const releaseConnection = useCallback(() => {
    ++connectionGenerationRef.current;
    const unsubscribe = unsubscribeRef.current;
    unsubscribeRef.current = null;
    unsubscribe?.();

    const transport = transportRef.current;
    transportRef.current = null;
    transport?.disconnect();
  }, []);

  const cancelSessionBestEffort = useCallback(
    async (session: BackendSession | null): Promise<boolean> => {
      if (!session) return true;
      try {
        await sessionClient.cancelSession(session.sessionId);
        return true;
      } catch {
        return false;
      }
    },
    [sessionClient]
  );

  const handleFrameDisconnect = useCallback(
    (runId: number, close: FrameConnectionClose) => {
      if (!mountedRef.current || runId !== runIdRef.current) return;

      clearScheduledRetry();
      releaseConnection();
      recoveryPendingRef.current = false;

      const classification = classifyFrameConnectionClose(close);
      const wasManualRetry = manualRetryInFlightRef.current;
      manualRetryInFlightRef.current = false;
      if (!classification.retryable) {
        recoveryAttemptRef.current = 0;
        canRetryManuallyRef.current = false;
        dispatch({
          type: 'DISCONNECTED',
          runId,
          message: classification.message,
          canRetryManually: false
        });
        return;
      }

      if (wasManualRetry) {
        recoveryAttemptRef.current = 0;
        canRetryManuallyRef.current = true;
        dispatch({
          type: 'DISCONNECTED',
          runId,
          message: `${classification.message} 다시 연결할 수 있습니다.`,
          canRetryManually: true
        });
        return;
      }

      const nextAttempt = recoveryAttemptRef.current + 1;
      const delay = getFrameReconnectDelay(reconnectPolicy, nextAttempt);
      const maxAttempts = getFrameReconnectMaxAttempts(reconnectPolicy);

      if (delay === null || maxAttempts === null) {
        const exhausted =
          maxAttempts !== null &&
          maxAttempts > 0 &&
          recoveryAttemptRef.current >= maxAttempts;
        canRetryManuallyRef.current = true;

        if (exhausted) {
          dispatch({ type: 'RECOVERY_FAILED', runId });
        } else {
          dispatch({
            type: 'DISCONNECTED',
            runId,
            message: `${classification.message} 다시 연결할 수 있습니다.`,
            canRetryManually: true
          });
        }
        return;
      }

      recoveryAttemptRef.current = nextAttempt;
      recoveryPendingRef.current = true;
      canRetryManuallyRef.current = false;
      dispatch({
        type: 'RECONNECT_SCHEDULED',
        runId,
        attempt: nextAttempt,
        maxAttempts
      });

      const retryGeneration = retryGenerationRef.current;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        if (
          !mountedRef.current ||
          runId !== runIdRef.current ||
          retryGeneration !== retryGenerationRef.current ||
          !recoveryPendingRef.current
        ) {
          return;
        }

        try {
          connectFrameTransportRef.current(runId);
        } catch {
          handleFrameDisconnectRef.current(runId, { code: 1006, wasClean: false });
        }
      }, delay);
    },
    [clearScheduledRetry, reconnectPolicy, releaseConnection]
  );

  const connectFrameTransport = useCallback(
    (runId: number) => {
      const session = sessionRef.current;
      if (!session || !mountedRef.current || runId !== runIdRef.current) return;

      releaseConnection();
      const connectionGeneration = connectionGenerationRef.current;
      const transport = transportFactory({
        webSocketUrl: session.frameWebSocketUrl,
        sessionId: session.sessionId,
        protocol: session.frameProtocol,
        initialSequence: lastAcceptedSequenceRef.current
      });
      transportRef.current = transport;
      unsubscribeRef.current = transport.subscribe((event: SessionFrameTransportEvent) => {
        if (
          !mountedRef.current ||
          runId !== runIdRef.current ||
          connectionGeneration !== connectionGenerationRef.current
        ) {
          return;
        }

        switch (event.type) {
          case 'CONNECTED':
            dispatch({ type: 'FRAME_CONNECTED', runId });
            break;
          case 'FRAME_RECEIVED':
            lastAcceptedSequenceRef.current = event.frame.metadata.sequence;
            recoveryAttemptRef.current = 0;
            recoveryPendingRef.current = false;
            canRetryManuallyRef.current = false;
            manualRetryInFlightRef.current = false;
            dispatch({ type: 'FRAME_RECEIVED', runId, frame: event.frame });
            break;
          case 'DISCONNECTED':
            handleFrameDisconnectRef.current(runId, event.close);
            break;
          case 'SAFE_ERROR':
            clearScheduledRetry();
            releaseConnection();
            recoveryPendingRef.current = false;
            canRetryManuallyRef.current = false;
            manualRetryInFlightRef.current = false;
            dispatch({
              type: 'SAFE_ERROR',
              runId,
              message: event.message,
              canRetryManually: false
            });
            break;
        }
      });
      transport.connect();
    },
    [clearScheduledRetry, releaseConnection, transportFactory]
  );

  connectFrameTransportRef.current = connectFrameTransport;
  handleFrameDisconnectRef.current = handleFrameDisconnect;

  const start = useCallback(async () => {
    if (runningRef.current) return;

    clearScheduledRetry();
    releaseConnection();
    runningRef.current = true;
    recoveryAttemptRef.current = 0;
    recoveryPendingRef.current = false;
    canRetryManuallyRef.current = false;
    manualRetryInFlightRef.current = false;
    lastAcceptedSequenceRef.current = 0;
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'START_REQUESTED', runId });

    try {
      const session = await sessionClient.createSession(SESSION_REQUEST, {
        signal: controller.signal
      });

      if (!mountedRef.current || runId !== runIdRef.current) {
        await cancelSessionBestEffort(session);
        return;
      }

      sessionRef.current = session;
      dispatch({ type: 'SESSION_CREATED', runId });
      connectFrameTransportRef.current(runId);
    } catch {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      runningRef.current = false;
      clearScheduledRetry();
      releaseConnection();
      const session = sessionRef.current;
      sessionRef.current = null;
      await cancelSessionBestEffort(session);
      dispatch({
        type: 'SAFE_ERROR',
        runId,
        message: '실제 데모 화면에 연결하지 못했습니다. 실행 상태를 확인해 주세요.'
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [cancelSessionBestEffort, clearScheduledRetry, releaseConnection, sessionClient]);

  const retry = useCallback(() => {
    if (
      !mountedRef.current ||
      !sessionRef.current ||
      !canRetryManuallyRef.current ||
      recoveryPendingRef.current
    ) {
      return;
    }

    clearScheduledRetry();
    recoveryAttemptRef.current = 0;
    recoveryPendingRef.current = true;
    canRetryManuallyRef.current = false;
    manualRetryInFlightRef.current = true;
    const runId = runIdRef.current;
    dispatch({ type: 'MANUAL_RETRY_STARTED', runId });

    try {
      connectFrameTransportRef.current(runId);
    } catch {
      recoveryPendingRef.current = false;
      canRetryManuallyRef.current = true;
      manualRetryInFlightRef.current = false;
      releaseConnection();
      dispatch({ type: 'RECOVERY_FAILED', runId });
    }
  }, [clearScheduledRetry, releaseConnection]);

  const reset = useCallback(async () => {
    const nextRunId = ++runIdRef.current;
    runningRef.current = false;
    recoveryPendingRef.current = false;
    canRetryManuallyRef.current = false;
    manualRetryInFlightRef.current = false;
    recoveryAttemptRef.current = 0;
    lastAcceptedSequenceRef.current = 0;
    abortRef.current?.abort();
    abortRef.current = null;
    clearScheduledRetry();
    releaseConnection();

    const session = sessionRef.current;
    sessionRef.current = null;
    dispatch({ type: 'RESET', nextRunId });

    const cleaned = await cancelSessionBestEffort(session);
    if (!cleaned && mountedRef.current && nextRunId === runIdRef.current) {
      dispatch({
        type: 'SAFE_ERROR',
        runId: nextRunId,
        message: '세션 정리를 완료하지 못했습니다. Backend 상태를 확인해 주세요.'
      });
    }
  }, [cancelSessionBestEffort, clearScheduledRetry, releaseConnection]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ++runIdRef.current;
      runningRef.current = false;
      recoveryPendingRef.current = false;
      canRetryManuallyRef.current = false;
      manualRetryInFlightRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
      clearScheduledRetry();
      releaseConnection();
      const session = sessionRef.current;
      sessionRef.current = null;
      void cancelSessionBestEffort(session);
    };
  }, [cancelSessionBestEffort, clearScheduledRetry, releaseConnection]);

  return {
    phase: state.phase,
    frame: state.frame,
    message: state.message,
    hasReceivedFirstFrame: state.hasReceivedFirstFrame,
    canReset: state.canReset,
    recoveryAttempt: state.recoveryAttempt,
    recoveryMaxAttempts: state.recoveryMaxAttempts,
    canRetryManually: state.canRetryManually,
    recoveryPending: state.recoveryPending,
    canSubmitViewerAction: canSubmitViewerAction(state),
    start,
    retry,
    reset
  };
}
