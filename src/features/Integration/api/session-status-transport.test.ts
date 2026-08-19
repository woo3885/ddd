import { describe, expect, it, vi } from 'vitest';

import {
  SESSION_STATUS_HEARTBEAT_MS,
  createSessionStatusTransport,
  createSessionStatusWebSocketUrl,
  sanitizeSessionMessage,
  validateSessionUiEvent,
  type SessionStatusStompConfig,
  type SessionStatusTransportEvent,
  type SessionUiEvent
} from './session-status-transport';

const SESSION_ID = 'session-001';

function stateEvent(sequence = 1): SessionUiEvent {
  return {
    eventId: `evt-${sequence}`,
    eventSequence: sequence,
    eventType: 'STATE',
    sessionId: SESSION_ID,
    status: 'AI_EXECUTING',
    message: 'AI가 다음 행동을 판단하고 있습니다.',
    actionRequired: false,
    target: null,
    occurredAt: '2026-08-19T12:00:00Z'
  };
}

function targetEvent(sequence = 2): SessionUiEvent {
  return {
    eventId: `evt-${sequence}`,
    eventSequence: sequence,
    eventType: 'TARGET',
    sessionId: SESSION_ID,
    status: null,
    message: '예금 상품을 확인해 주세요.',
    actionRequired: false,
    target: {
      elementId: 'el-target-001',
      label: '예금 상품 선택',
      x: 100,
      y: 120,
      width: 200,
      height: 60,
      frameId: 'frm-001',
      frameSequence: 3,
      snapshotId: 'snap-001'
    },
    occurredAt: '2026-08-19T12:00:01Z'
  };
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('session-status-transport', () => {
  it('Backend base URL과 같은 host의 /ws URL만 만든다', () => {
    expect(createSessionStatusWebSocketUrl('http://127.0.0.1:8080')).toBe(
      'ws://127.0.0.1:8080/ws'
    );
    expect(createSessionStatusWebSocketUrl('https://backend.example.com')).toBe(
      'wss://backend.example.com/ws'
    );
    expect(() =>
      createSessionStatusWebSocketUrl('http://user@127.0.0.1:8080?token=x')
    ).toThrow();
  });

  it('실제 topic과 10초 heartbeat로 구독한 뒤 snapshot과 buffered event를 순서대로 적용한다', async () => {
    const pendingSnapshot = deferred<Response>();
    const events: SessionStatusTransportEvent[] = [];
    let config!: SessionStatusStompConfig;
    let messageCallback!: (message: { body: string }) => void;
    const unsubscribe = vi.fn();
    const deactivate = vi.fn();
    const subscribe = vi.fn((destination, callback) => {
      expect(destination).toBe(`/topic/sessions/${SESSION_ID}/events`);
      messageCallback = callback;
      return { unsubscribe };
    });
    const transport = createSessionStatusTransport({
      sessionId: SESSION_ID,
      fetchImpl: vi.fn(() => pendingSnapshot.promise),
      stompClientFactory: (nextConfig) => {
        config = nextConfig;
        return { activate: vi.fn(), deactivate, subscribe };
      }
    });
    transport.subscribe((event) => events.push(event));
    transport.connect();

    expect(config.brokerURL).toBe('ws://127.0.0.1:8080/ws');
    expect(config.heartbeatIncoming).toBe(SESSION_STATUS_HEARTBEAT_MS);
    expect(config.heartbeatOutgoing).toBe(SESSION_STATUS_HEARTBEAT_MS);
    config.onConnect();
    messageCallback({ body: JSON.stringify(targetEvent(2)) });

    pendingSnapshot.resolve(
      jsonResponse({
        sessionId: SESSION_ID,
        latestEventSequence: 1,
        state: stateEvent(1),
        guide: null,
        target: null
      })
    );
    await vi.waitFor(() => {
      expect(events.map((event) => event.type)).toEqual([
        'SYNC_STARTED',
        'SNAPSHOT_RECEIVED',
        'EVENT_RECEIVED',
        'CONNECTED'
      ]);
    });
    expect(
      events.find((event) => event.type === 'EVENT_RECEIVED')
    ).toMatchObject({ event: { eventSequence: 2 } });

    transport.disconnect();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(deactivate).toHaveBeenCalledTimes(1);
  });

  it('snapshot 이하 buffered duplicate는 적용하지 않는다', async () => {
    const pendingSnapshot = deferred<Response>();
    const events: SessionStatusTransportEvent[] = [];
    let config!: SessionStatusStompConfig;
    let messageCallback!: (message: { body: string }) => void;
    const transport = createSessionStatusTransport({
      sessionId: SESSION_ID,
      fetchImpl: () => pendingSnapshot.promise,
      stompClientFactory: (nextConfig) => {
        config = nextConfig;
        return {
          activate: vi.fn(),
          deactivate: vi.fn(),
          subscribe: (_destination, callback) => {
            messageCallback = callback;
            return { unsubscribe: vi.fn() };
          }
        };
      }
    });
    transport.subscribe((event) => events.push(event));
    transport.connect();
    config.onConnect();
    messageCallback({ body: JSON.stringify(stateEvent(1)) });
    messageCallback({ body: JSON.stringify(targetEvent(2)) });
    messageCallback({ body: JSON.stringify(targetEvent(2)) });
    pendingSnapshot.resolve(
      jsonResponse({
        sessionId: SESSION_ID,
        latestEventSequence: 1,
        state: stateEvent(1),
        guide: null,
        target: null
      })
    );

    await vi.waitFor(() =>
      expect(events.filter((event) => event.type === 'EVENT_RECEIVED')).toHaveLength(1)
    );
  });

  it('session mismatch와 unknown event를 fail-closed 처리한다', () => {
    expect(() =>
      validateSessionUiEvent(
        { ...stateEvent(), sessionId: 'session-other' },
        SESSION_ID
      )
    ).toThrow('실시간 상태 정보를 안전하게 확인할 수 없습니다.');
    expect(() =>
      validateSessionUiEvent(
        { ...stateEvent(), eventType: 'UNKNOWN' },
        SESSION_ID
      )
    ).toThrow('실시간 상태 정보를 안전하게 확인할 수 없습니다.');
  });

  it('malformed JSON은 raw payload를 노출하지 않고 연결을 종료한다', () => {
    const events: SessionStatusTransportEvent[] = [];
    let config!: SessionStatusStompConfig;
    let messageCallback!: (message: { body: string }) => void;
    const deactivate = vi.fn();
    const transport = createSessionStatusTransport({
      sessionId: SESSION_ID,
      fetchImpl: vi.fn(() => new Promise<Response>(() => undefined)),
      stompClientFactory: (nextConfig) => {
        config = nextConfig;
        return {
          activate: vi.fn(),
          deactivate,
          subscribe: (_destination, callback) => {
            messageCallback = callback;
            return { unsubscribe: vi.fn() };
          }
        };
      }
    });
    transport.subscribe((event) => events.push(event));
    transport.connect();
    config.onConnect();
    messageCallback({ body: '{"eventId":"private"' });

    expect(events[events.length - 1]).toEqual({
      type: 'SAFE_ERROR',
      message: '실시간 상태 연결을 안전하게 처리하지 못했습니다.'
    });
    expect(JSON.stringify(events)).not.toContain('private');
    expect(deactivate).toHaveBeenCalledTimes(1);
  });

  it('HTML·민감정보·과도한 줄바꿈은 상태별 안전 문구로 대체한다', () => {
    const fallback = 'AI가 화면을 확인하고 다음 안내를 준비하고 있습니다.';
    expect(sanitizeSessionMessage('<script>alert(1)</script>', 'AI_EXECUTING')).toBe(
      fallback
    );
    expect(sanitizeSessionMessage('OTP: 123456', 'AI_EXECUTING')).toBe(fallback);
    expect(sanitizeSessionMessage('비밀번호: Abcd!234', 'AI_EXECUTING')).toBe(
      fallback
    );
    expect(sanitizeSessionMessage('첫째\n둘째\n셋째', 'AI_EXECUTING')).toBe(fallback);
    expect(sanitizeSessionMessage('  안전한 안내입니다.  ', 'AI_EXECUTING')).toBe(
      '안전한 안내입니다.'
    );
  });

  it('재연결 onConnect마다 새 snapshot을 조회해 resync한다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          sessionId: SESSION_ID,
          latestEventSequence: 0,
          state: null,
          guide: null,
          target: null
        })
      );
    const events: SessionStatusTransportEvent[] = [];
    let config!: SessionStatusStompConfig;
    const transport = createSessionStatusTransport({
      sessionId: SESSION_ID,
      fetchImpl,
      stompClientFactory: (nextConfig) => {
        config = nextConfig;
        return {
          activate: vi.fn(),
          deactivate: vi.fn(),
          subscribe: () => ({ unsubscribe: vi.fn() })
        };
      }
    });
    transport.subscribe((event) => events.push(event));
    transport.connect();
    config.onConnect();
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    config.onWebSocketClose();
    config.onConnect();
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    expect(events.filter((event) => event.type === 'SYNC_STARTED')).toHaveLength(2);
    expect(events.some((event) => event.type === 'DISCONNECTED')).toBe(true);
  });
});
