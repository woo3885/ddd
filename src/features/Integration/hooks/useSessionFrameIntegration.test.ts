import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  SessionViewerFrame,
  SessionFrameTransport,
  SessionFrameTransportEvent
} from '@/features/Integration/api/session-frame-transport';
import type { BackendSession } from '@/features/Integration/api/session-rest-client';
import { createFrameReconnectPolicy } from '@/features/Integration/model/frame-reconnect-policy';
import { useSessionFrameIntegration } from './useSessionFrameIntegration';

const session: BackendSession = {
  sessionId: 'session-123',
  status: 'SESSION_CREATED',
  frameWebSocketPath: '/ws/sessions/session-123/frames',
  frameProtocol: 'ddd.browser-frame.v1',
  frameWebSocketUrl: 'ws://127.0.0.1:8080/ws/sessions/session-123/frames'
};

const frame: SessionViewerFrame = {
  metadata: {
    type: 'BROWSER_FRAME' as const,
    sessionId: 'session-123',
    frameId: 'frm-123',
    sequence: 1,
    timestamp: 1_786_350_000_000,
    width: 1280,
    height: 720,
    mimeType: 'image/png' as const,
    byteLength: 4
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

afterEach(() => {
  vi.useRealTimers();
});

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
      protocol: session.frameProtocol,
      initialSequence: 0
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

    act(() => transport.emit({ type: 'FRAME_RECEIVED', frame }));
    expect(result.current.phase).toBe('FRAME_READY');
    expect(result.current.frame).toBe(frame);
    expect(result.current.frame?.metadata).toMatchObject({
      frameId: 'frm-123',
      sequence: 1,
      timestamp: 1_786_350_000_000
    });
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

    act(() => oldListener({ type: 'FRAME_RECEIVED', frame }));
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

  it('production 정책이 없으면 일시적 종료에도 자동 reconnect하지 않는다', async () => {
    vi.useFakeTimers();
    const transport = createFakeTransport();
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const transportFactory = vi.fn(() => transport);
    const { result } = renderHook(() =>
      useSessionFrameIntegration({ sessionClient, transportFactory })
    );
    await act(async () => result.current.start());

    act(() =>
      transport.emit({
        type: 'DISCONNECTED',
        close: { code: 1006, wasClean: false }
      })
    );
    await act(async () => vi.runAllTimersAsync());

    expect(result.current).toMatchObject({
      phase: 'DISCONNECTED',
      canRetryManually: true,
      recoveryPending: false,
      canSubmitViewerAction: false
    });
    expect(transportFactory).toHaveBeenCalledTimes(1);
    expect(sessionClient.createSession).toHaveBeenCalledTimes(1);
  });

  it('Preview Mock 정책을 주입하면 예약된 reconnect를 같은 session으로 실행한다', async () => {
    vi.useFakeTimers();
    const first = createFakeTransport();
    const second = createFakeTransport();
    const transportFactory = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({
        sessionClient,
        transportFactory,
        reconnectPolicy: createFrameReconnectPolicy([1_000])
      })
    );
    await act(async () => result.current.start());
    act(() => first.emit({ type: 'CONNECTED' }));
    act(() => first.emit({ type: 'FRAME_RECEIVED', frame }));

    act(() =>
      first.emit({
        type: 'DISCONNECTED',
        close: { code: 1012, wasClean: false }
      })
    );
    expect(result.current).toMatchObject({
      phase: 'RECONNECTING',
      recoveryAttempt: 1,
      recoveryMaxAttempts: 1,
      recoveryPending: true,
      canSubmitViewerAction: false
    });

    await act(async () => vi.advanceTimersByTimeAsync(1_000));

    expect(transportFactory).toHaveBeenCalledTimes(2);
    expect(transportFactory).toHaveBeenLastCalledWith({
      webSocketUrl: session.frameWebSocketUrl,
      sessionId: session.sessionId,
      protocol: session.frameProtocol,
      initialSequence: 1
    });
    expect(sessionClient.createSession).toHaveBeenCalledTimes(1);
  });

  it('reconnect는 더 큰 sequence frame을 받아야 완료되고 attempt를 초기화한다', async () => {
    vi.useFakeTimers();
    const first = createFakeTransport();
    const second = createFakeTransport();
    const transportFactory = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({
        sessionClient,
        transportFactory,
        reconnectPolicy: createFrameReconnectPolicy([0])
      })
    );
    await act(async () => result.current.start());
    act(() => first.emit({ type: 'FRAME_RECEIVED', frame }));
    act(() =>
      first.emit({ type: 'DISCONNECTED', close: { code: 1006, wasClean: false } })
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));

    act(() => second.emit({ type: 'CONNECTED' }));
    expect(result.current.phase).toBe('RECONNECTING');

    const nextFrame: SessionViewerFrame = {
      ...frame,
      metadata: { ...frame.metadata, frameId: 'frm-124', sequence: 2 },
      imageSrc: 'blob:frame-2'
    };
    act(() => second.emit({ type: 'FRAME_RECEIVED', frame: nextFrame }));

    expect(result.current).toMatchObject({
      phase: 'FRAME_READY',
      frame: nextFrame,
      recoveryAttempt: 0,
      recoveryPending: false,
      canSubmitViewerAction: true
    });
  });

  it('자동 복구 최대 횟수 뒤 안전한 오류와 수동 retry를 제공한다', async () => {
    vi.useFakeTimers();
    const first = createFakeTransport();
    const second = createFakeTransport();
    const third = createFakeTransport();
    const transportFactory = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(third);
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const { result } = renderHook(() =>
      useSessionFrameIntegration({
        sessionClient,
        transportFactory,
        reconnectPolicy: createFrameReconnectPolicy([0])
      })
    );
    await act(async () => result.current.start());
    act(() =>
      first.emit({ type: 'DISCONNECTED', close: { code: 1006, wasClean: false } })
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));
    act(() =>
      second.emit({ type: 'DISCONNECTED', close: { code: 1006, wasClean: false } })
    );

    expect(result.current).toMatchObject({
      phase: 'ERROR',
      canRetryManually: true,
      recoveryPending: false
    });

    act(() => {
      result.current.retry();
      result.current.retry();
    });

    expect(transportFactory).toHaveBeenCalledTimes(3);
    expect(sessionClient.createSession).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({
      phase: 'RECONNECTING',
      canRetryManually: false,
      recoveryPending: true
    });

    act(() =>
      third.emit({ type: 'DISCONNECTED', close: { code: 1006, wasClean: false } })
    );
    await act(async () => vi.runAllTimersAsync());

    expect(transportFactory).toHaveBeenCalledTimes(3);
    expect(result.current).toMatchObject({
      phase: 'DISCONNECTED',
      canRetryManually: true,
      recoveryPending: false
    });
  });

  it('retry 불가능하거나 알 수 없는 종료는 fail-closed로 자동 복구하지 않는다', async () => {
    vi.useFakeTimers();
    const transport = createFakeTransport();
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const transportFactory = vi.fn(() => transport);
    const { result } = renderHook(() =>
      useSessionFrameIntegration({
        sessionClient,
        transportFactory,
        reconnectPolicy: createFrameReconnectPolicy([0, 10])
      })
    );
    await act(async () => result.current.start());

    act(() =>
      transport.emit({
        type: 'DISCONNECTED',
        close: { code: 4999, wasClean: false }
      })
    );
    await act(async () => vi.runAllTimersAsync());

    expect(result.current).toMatchObject({
      phase: 'DISCONNECTED',
      canRetryManually: false,
      recoveryPending: false
    });
    expect(transportFactory).toHaveBeenCalledTimes(1);
  });

  it('reset은 예약된 reconnect timer와 socket을 정리한다', async () => {
    vi.useFakeTimers();
    const transport = createFakeTransport();
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const transportFactory = vi.fn(() => transport);
    const { result } = renderHook(() =>
      useSessionFrameIntegration({
        sessionClient,
        transportFactory,
        reconnectPolicy: createFrameReconnectPolicy([1_000])
      })
    );
    await act(async () => result.current.start());
    act(() =>
      transport.emit({ type: 'DISCONNECTED', close: { code: 1006, wasClean: false } })
    );

    await act(async () => result.current.reset());
    await act(async () => vi.advanceTimersByTimeAsync(1_000));

    expect(transportFactory).toHaveBeenCalledTimes(1);
    expect(sessionClient.cancelSession).toHaveBeenCalledWith(session.sessionId);
    expect(result.current.phase).toBe('IDLE');
  });

  it('unmount는 예약된 reconnect timer와 늦은 callback을 차단한다', async () => {
    vi.useFakeTimers();
    const transport = createFakeTransport();
    const sessionClient = {
      createSession: vi.fn().mockResolvedValue(session),
      cancelSession: vi.fn().mockResolvedValue(session)
    };
    const transportFactory = vi.fn(() => transport);
    const { result, unmount } = renderHook(() =>
      useSessionFrameIntegration({
        sessionClient,
        transportFactory,
        reconnectPolicy: createFrameReconnectPolicy([1_000])
      })
    );
    await act(async () => result.current.start());
    act(() =>
      transport.emit({ type: 'DISCONNECTED', close: { code: 1006, wasClean: false } })
    );

    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(1_000));

    expect(transportFactory).toHaveBeenCalledTimes(1);
    expect(sessionClient.cancelSession).toHaveBeenCalledWith(session.sessionId);
  });
});
