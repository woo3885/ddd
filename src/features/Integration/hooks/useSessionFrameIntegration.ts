import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  createSessionFrameTransport,
  type SessionFrameTransport,
  type SessionFrameTransportOptions
} from '@/features/Integration/api/session-frame-transport';
import {
  defaultSessionRestClient,
  type BackendSession,
  type CreateBackendSessionRequest,
  type SessionRestClient
} from '@/features/Integration/api/session-rest-client';
import { sessionFrameReducer } from '@/features/Integration/model/session-frame-reducer';
import { initialSessionFrameState } from '@/features/Integration/model/session-frame-state';

const SESSION_REQUEST: CreateBackendSessionRequest = {
  userRequest: '계좌 선택 화면을 확인합니다.',
  siteId: 'demo-bank',
  initialPath: '/transfer/accounts'
};

type SessionClient = Pick<SessionRestClient, 'createSession' | 'cancelSession'>;
type TransportFactory = (
  options: SessionFrameTransportOptions
) => SessionFrameTransport;

export interface UseSessionFrameIntegrationOptions {
  sessionClient?: SessionClient;
  transportFactory?: TransportFactory;
}

export function useSessionFrameIntegration(
  options: UseSessionFrameIntegrationOptions = {}
) {
  const sessionClient = options.sessionClient ?? defaultSessionRestClient;
  const transportFactory = options.transportFactory ?? createSessionFrameTransport;
  const [state, dispatch] = useReducer(sessionFrameReducer, initialSessionFrameState);
  const runIdRef = useRef(0);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<BackendSession | null>(null);
  const transportRef = useRef<SessionFrameTransport | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const releaseConnection = useCallback(() => {
    transportRef.current?.disconnect();
    transportRef.current = null;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
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

  const start = useCallback(async () => {
    if (runningRef.current) return;

    runningRef.current = true;
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

      const transport = transportFactory({
        webSocketUrl: session.frameWebSocketUrl,
        sessionId: session.sessionId,
        protocol: session.frameProtocol
      });
      transportRef.current = transport;
      unsubscribeRef.current = transport.subscribe((event) => {
        if (!mountedRef.current || runId !== runIdRef.current) return;

        switch (event.type) {
          case 'CONNECTED':
            dispatch({ type: 'FRAME_CONNECTED', runId });
            break;
          case 'FRAME_RECEIVED':
            dispatch({ type: 'FRAME_RECEIVED', runId, frame: event.frame });
            break;
          case 'DISCONNECTED':
            runningRef.current = false;
            dispatch({ type: 'DISCONNECTED', runId });
            break;
          case 'SAFE_ERROR':
            runningRef.current = false;
            dispatch({ type: 'SAFE_ERROR', runId, message: event.message });
            break;
        }
      });
      transport.connect();
    } catch {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      runningRef.current = false;
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
  }, [cancelSessionBestEffort, releaseConnection, sessionClient, transportFactory]);

  const reset = useCallback(async () => {
    const nextRunId = ++runIdRef.current;
    runningRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
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
  }, [cancelSessionBestEffort, releaseConnection]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ++runIdRef.current;
      runningRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
      releaseConnection();
      const session = sessionRef.current;
      sessionRef.current = null;
      void cancelSessionBestEffort(session);
    };
  }, [cancelSessionBestEffort, releaseConnection]);

  return {
    phase: state.phase,
    frame: state.frame,
    message: state.message,
    hasReceivedFirstFrame: state.hasReceivedFirstFrame,
    canReset: state.canReset,
    start,
    reset
  };
}
