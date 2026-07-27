import { describe, expect, it } from 'vitest';
import partialResultJson from '../../mocks/stt-partial-result.json';
import finalResultJson from '../../mocks/stt-final-result.json';
import errorJson from '../../mocks/stt-error.json';
import type {
  SttErrorEvent,
  SttEvent,
  SttFinalResultEvent,
  SttPartialResultEvent,
  SttStartedEvent
} from '@/types/stt-events';

describe('STT event types', () => {
  it('시작 이벤트의 공통 필드를 허용한다', () => {
    const event = {
      type: 'STT_STARTED',
      sessionId: 'bs-20260727-001',
      utteranceId: 'utt-001',
      timestamp: 1785140000000
    } satisfies SttStartedEvent;

    expect(event.type).toBe('STT_STARTED');
  });

  it('중간 결과 JSON이 STT_PARTIAL_RESULT 계약과 일치한다', () => {
    const event = {
      ...partialResultJson,
      type: 'STT_PARTIAL_RESULT',
      language: 'ko-KR',
      isFinal: false
    } satisfies SttPartialResultEvent;

    expect(event.sequence).toBe(1);
    expect(event.confidence).toBeNull();
  });

  it('최종 결과 JSON과 단어 타임라인이 계약과 일치한다', () => {
    const event = {
      ...finalResultJson,
      type: 'STT_FINAL_RESULT',
      language: 'ko-KR',
      isFinal: true
    } satisfies SttFinalResultEvent;

    expect(event.durationMs).toBe(event.endedAt - event.startedAt);
    expect(event.words[event.words.length - 1]?.endMs).toBe(event.durationMs);
  });

  it('오류 JSON이 허용된 오류 코드와 재시도 여부를 제공한다', () => {
    const event = {
      ...errorJson,
      type: 'STT_ERROR',
      code: 'NO_SPEECH_DETECTED'
    } satisfies SttErrorEvent;

    expect(event.retryable).toBe(true);
  });

  it('모든 이벤트를 SttEvent 유니언으로 처리한다', () => {
    const events: SttEvent[] = [
      {
        type: 'STT_STARTED',
        sessionId: 'bs-20260727-001',
        utteranceId: 'utt-001',
        timestamp: 1785140000000
      },
      {
        ...partialResultJson,
        type: 'STT_PARTIAL_RESULT',
        language: 'ko-KR',
        isFinal: false
      },
      {
        ...finalResultJson,
        type: 'STT_FINAL_RESULT',
        language: 'ko-KR',
        isFinal: true
      },
      {
        ...errorJson,
        type: 'STT_ERROR',
        code: 'NO_SPEECH_DETECTED'
      }
    ];

    expect(events.map(({ type }) => type)).toEqual([
      'STT_STARTED',
      'STT_PARTIAL_RESULT',
      'STT_FINAL_RESULT',
      'STT_ERROR'
    ]);
  });

  it('정의되지 않은 오류 코드를 거부한다', () => {
    const event: SttErrorEvent = {
      type: 'STT_ERROR',
      sessionId: 'bs-20260727-001',
      utteranceId: 'utt-003',
      timestamp: 1785140020000,
      // @ts-expect-error 허용 목록에 없는 오류 코드는 사용할 수 없다.
      code: 'INVALID_ERROR',
      message: '알 수 없는 오류',
      retryable: false
    };

    expect(event.code).toBe('INVALID_ERROR');
  });
});
