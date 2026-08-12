import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  SessionFrameTransport,
  SessionFrameTransportEvent
} from '@/features/Integration/api/session-frame-transport';
import type { BackendSession } from '@/features/Integration/api/session-rest-client';
import { useSessionFrameIntegration } from './useSessionFrameIntegration';

const session: BackendSession = {
  sessionId: 'session-123',
  status: 'SESSION_CREATED',
  frameWebSocketPath: '/ws/sessions/session-123/frames',
  frameProtocol: 'ddd.browser-frame.v1',
  frameWebSocketUrl: 'ws://127.0.0.1:8080/ws/sessions/session-123/frames'
};

const frame = {
  metadata: {
    type: 'BROWSER_FRAME' as const,
    sessionId: 'session-123',
    timestamp: 1_786_350_000_000,
    width: 1280,
    height: 720
  },
  imageSrc: 'blob:frame-1'
};

function createFakeTransport(order: string[] = []) {
  const listeners = new Set<(event: SessionFrameTransportEvent) => void>();
  const transport: SessionFrameTransport & {
    emit(event: SessionFrameTransportEvent): void;
  } = {
    subscribe: vi.fn((listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    connect: vi.fn(() => order.push('connect')),
    disconnect: vi.fn(() => order.push('disconnect')),
    emit(event) {
      listeners.forEach((listener) => listener(event));
    }
  };
  return transport;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('useSessionFrameIntegration', () => {
  it('mount만으로 session 또는 WebSocket을 시작하지 않는다', () => {
    const sessionClient = {
      createSession: vi.fn(),
      cancelSession: vi.fn()
    };
    const transportFactory = vi.fn();
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory })
    );

    expect(result.current.phase).toBe('IDLE');
    expect(sessionClient.createSession).not.toHaveBeenCalled();
    expect(transportFactory).not.toHaveBeenCalled();
  });

  it('사용자 start에서 REST 후 WebSocket 순서로 시작한다', async () => {
    const order: string[] = [];
    const transport = createFakeTransport(order);
    const sessionClient = {
      createSession: vi.fn(async () => {
        order.push('rest');
        return session;
      }),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const transportFactory = vi.fn(() => transport);
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory })
    );

    await act(async () => result.current.start());

    expect(order).toEqual(['rest', 'connect']);
    expect(sessionClient.createSession).toHaveBeenCalledWith(
      {
        userRequest: '계좌 선택 화면을 확인합니다.',
        siteId: 'demo-bank',
        initialPath: '/transfer/accounts'
      },
      { signal: expect.any(AbortSignal) }
    );
    expect(transportFactory).toHaveBeenCalledWith({
      webSocketUrl: session.frameWebSocketUrl,
      sessionId: session.sessionId,
      protocol: session.frameProtocol
    });
    expect(result.current.phase).toBe('CONNECTING_FRAME');
  });

  it('중복 start를 차단한다', async () => {
    const pending = deferred<BackendSession>();
    const sessionClient = {
      createSession: vi.fn(() => pending.promise),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const transport = createFakeTransport();
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory: () => transport })
    );

    let first!: Promise<void>;
    act(() => {
      first = result.current.start();
      void result.current.start();
    });
    expect(sessionClient.createSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(session);
      await first;
    });
  });

  it('연결과 첫 frame callback을 실제 전용 state에 반영한다', async () => {
    const transport = createFakeTransport();
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory: () => transport })
    );
    await act(async () => result.current.start());

    act(() => transport.emit({ type: 'CONNECTED' }));
    expect(result.current.phase).toBe('WAITING_FIRST_FRAME');

    act(() => transport.emit({ type: 'FRAME_RECEIVED', frame, sequence: 1 }));
    expect(result.current.phase).toBe('FRAME_READY');
    expect(result.current.frame).toBe(frame);
    expect(result.current.hasReceivedFirstFrame).toBe(true);
  });

  it('reset에서 socket을 먼저 닫고 session을 best-effort 취소한다', async () => {
    const order: string[] = [];
    const transport = createFakeTransport(order);
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn(async () => {
        order.push('cancel');
        return session;
      })
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory: () => transport })
    );
    await act(async () => result.current.start());
    order.length = 0;

    await act(async () => result.current.reset());

    expect(order).toEqual(['disconnect', 'cancel']);
    expect(result.current.phase).toBe('IDLE');
    expect(result.current.frame).toBeUndefined();
  });

  it('stale REST 응답은 연결하지 않고 생성된 session을 정리한다', async () => {
    const pending = deferred<BackendSession>();
    const sessionClient = {
      createSession: vi.fn(() => pending.promise),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const transportFactory = vi.fn(() => createFakeTransport());
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory })
    );

    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    await act(async () => result.current.reset());
    await act(async () => {
      pending.resolve(session);
      await startPromise;
    });

    expect(transportFactory).not.toHaveBeenCalled();
    expect(sessionClient.cancelSession).toHaveBeenCalledWith(session.sessionId);
    expect(result.current.phase).toBe('IDLE');
  });

  it('이전 run callback은 reset 이후 무시한다', async () => {
    const transport = createFakeTransport();
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory: () => transport })
    );
    await act(async () => result.current.start());
    const oldListener = vi.mocked(transport.subscribe).mock.calls[0][0];
    await act(async () => result.current.reset());

    act(() => oldListener({ type: 'FRAME_RECEIVED', frame, sequence: 1 }));
    expect(result.current.phase).toBe('IDLE');
    expect(result.current.frame).toBeUndefined();
  });

  it('unmount에서 socket을 먼저 닫고 session cancel을 요청한다', async () => {
    const order: string[] = [];
    const transport = createFakeTransport(order);
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn(async () => {
        order.push('cancel');
        return session;
      })
    };
    const { result, unmount } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory: () => transport })
    );
    await act(async () => result.current.start());
    order.length = 0;

    unmount();
    await waitFor(() => expect(sessionClient.cancelSession).toHaveBeenCalled());
    expect(order).toEqual(['disconnect', 'cancel']);
  });

  it('cancel 실패는 raw 오류 대신 안전한 정리 안내를 사용한다', async () => {
    const transport = createFakeTransport();
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockRejectedValue(new Error('raw backend secret'))
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory: () => transport })
    );
    await act(async () => result.current.start());
    await act(async () => result.current.reset());

    expect(result.current.phase).toBe('ERROR');
    expect(result.current.message).toContain('세션 정리');
    expect(result.current.message).not.toContain('raw backend secret');
  });

  it('session 생성 후 transport 시작 실패 시 session을 즉시 정리한다', async () => {
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({
        sessionClient,
        transportFactory: () => {
          throw new Error('raw socket failure');
        }
      })
    );

    await act(async () => result.current.start());

    expect(sessionClient.cancelSession).toHaveBeenCalledWith(session.sessionId);
    expect(result.current.phase).toBe('ERROR');
    expect(result.current.message).not.toContain('raw socket failure');
  });
});
