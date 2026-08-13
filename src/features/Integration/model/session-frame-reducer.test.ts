import { describe, expect, it } from 'vitest';

import { sessionFrameReducer } from './session-frame-reducer';
import {
  createInitialSessionFrameState,
  initialSessionFrameState
} from './session-frame-state';

const frame = {
  metadata: {
    type: 'BROWSER_FRAME' as const,
    sessionId: 'session-123',
    timestamp: 1_786_350_000_000,
    width: 1280,
    height: 720
  },
  imageSrc: 'blob:frame'
};

describe('sessionFrameReducer', () => {
  it('안전한 초기 상태를 제공한다', () => {
    expect(initialSessionFrameState).toEqual({
      runId: 0,
      phase: 'IDLE',
      message: expect.any(String),
      frame: undefined,
      hasReceivedFirstFrame: false,
      canReset: false
    });
  });

  it('session 생성부터 첫 frame까지 phase를 순서대로 전환한다', () => {
    const creating = sessionFrameReducer(initialSessionFrameState, {
      type: 'START_REQUESTED',
      runId: 1
    });
    const connecting = sessionFrameReducer(creating, {
      type: 'SESSION_CREATED',
      runId: 1
    });
    const waiting = sessionFrameReducer(connecting, {
      type: 'FRAME_CONNECTED',
      runId: 1
    });
    const ready = sessionFrameReducer(waiting, {
      type: 'FRAME_RECEIVED',
      runId: 1,
      frame
    });

    expect(creating.phase).toBe('CREATING_SESSION');
    expect(connecting.phase).toBe('CONNECTING_FRAME');
    expect(waiting.phase).toBe('WAITING_FIRST_FRAME');
    expect(ready).toMatchObject({
      phase: 'FRAME_READY',
      frame,
      hasReceivedFirstFrame: true,
      canReset: true
    });
  });

  it('연결 종료와 안전한 오류에서 frame을 제거한다', () => {
    const ready = {
      ...createInitialSessionFrameState(2),
      phase: 'FRAME_READY' as const,
      frame,
      hasReceivedFirstFrame: true,
      canReset: true
    };

    expect(
      sessionFrameReducer(ready, { type: 'DISCONNECTED', runId: 2 })
    ).toMatchObject({ phase: 'DISCONNECTED', frame: undefined });
    expect(
      sessionFrameReducer(ready, {
        type: 'SAFE_ERROR',
        runId: 2,
        message: '안전한 안내입니다.'
      })
    ).toMatchObject({
      phase: 'ERROR',
      message: '안전한 안내입니다.',
      frame: undefined
    });
  });

  it('reset은 runId를 바꾸고 초기 상태로 복원한다', () => {
    const state = { ...createInitialSessionFrameState(3), canReset: true, frame };
    expect(
      sessionFrameReducer(state, { type: 'RESET', nextRunId: 4 })
    ).toEqual(createInitialSessionFrameState(4));
  });

  it('이전 runId callback을 무시하고 입력 state를 변경하지 않는다', () => {
    const state = { ...createInitialSessionFrameState(5), canReset: true };
    const result = sessionFrameReducer(state, {
      type: 'FRAME_RECEIVED',
      runId: 4,
      frame
    });

    expect(result).toBe(state);
    expect(state).toEqual({ ...createInitialSessionFrameState(5), canReset: true });
  });
});
