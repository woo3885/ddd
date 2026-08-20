import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  createSessionStatusTransport,
  type SessionStatusTransport,
  type SessionStatusTransportEvent,
  type SessionStatusTransportOptions
} from '@/features/Integration/api/session-status-transport';
import { sessionUiReducer } from '@/features/Integration/model/session-ui-reducer';
import {
  createInitialSessionUiState,
  type SessionFrameIdentity
} from '@/features/Integration/model/session-ui-state';
import type { WorkflowStatus } from '@/types/frontend-state';

type StatusTransportFactory = (
  options: SessionStatusTransportOptions
) => SessionStatusTransport;

export interface UseSessionStatusIntegrationOptions {
  sessionId: string;
  initialStatus?: WorkflowStatus;
  baseUrl?: string;
  transportFactory?: StatusTransportFactory;
}

export function useSessionStatusIntegration({
  sessionId,
  initialStatus = 'SESSION_CREATED',
  baseUrl,
  transportFactory = createSessionStatusTransport
}: UseSessionStatusIntegrationOptions) {
  const [state, dispatch] = useReducer(
    sessionUiReducer,
    undefined,
    () => createInitialSessionUiState(sessionId, initialStatus)
  );
  const generationRef = useRef(0);
  const transportRef = useRef<SessionStatusTransport | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const release = useCallback(() => {
    ++generationRef.current;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    transportRef.current?.disconnect();
    transportRef.current = null;
  }, []);

  useEffect(() => {
    release();
    const generation = generationRef.current;
    dispatch({ type: 'RESET', sessionId, initialStatus });

    let transport: SessionStatusTransport;
    try {
      transport = transportFactory({ sessionId, baseUrl });
    } catch {
      dispatch({
        type: 'SAFE_ERROR',
        message: '실시간 상태 연결 설정을 확인해 주세요.'
      });
      return release;
    }

    transportRef.current = transport;
    unsubscribeRef.current = transport.subscribe(
      (event: SessionStatusTransportEvent) => {
        if (generation !== generationRef.current) return;
        switch (event.type) {
          case 'SYNC_STARTED':
            dispatch({ type: 'SYNC_STARTED' });
            break;
          case 'SNAPSHOT_RECEIVED':
            dispatch({ type: 'SNAPSHOT_REPLACED', snapshot: event.snapshot });
            break;
          case 'EVENT_RECEIVED':
            dispatch({ type: 'EVENT_RECEIVED', event: event.event });
            break;
          case 'CONNECTED':
            dispatch({ type: 'CONNECTED' });
            break;
          case 'DISCONNECTED':
            dispatch({ type: 'DISCONNECTED' });
            break;
          case 'SAFE_ERROR':
            dispatch({ type: 'SAFE_ERROR', message: event.message });
            break;
        }
      }
    );

    try {
      transport.connect();
    } catch {
      dispatch({
        type: 'SAFE_ERROR',
        message: '실시간 상태 연결을 시작하지 못했습니다.'
      });
    }

    return release;
  }, [baseUrl, initialStatus, release, sessionId, transportFactory]);

  const observeFrame = useCallback((frame: SessionFrameIdentity | null) => {
    dispatch({ type: 'FRAME_OBSERVED', frame });
  }, []);

  return {
    ...state,
    observeFrame
  };
}
