import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  VOICE_CONTROLLER_SELECTORS,
  type SpeechRecognitionAlternativeLike,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionFactory,
  type SpeechRecognitionInstance,
  type SpeechRecognitionResultLike,
  type SpeechRecognitionResultListLike
} from '@/features/F4_VoiceController/model/speech-recognition';
import type { SttEvent } from '@/types/stt-events';

import F4_VoiceController from './F4_VoiceController';

interface MockSegment {
  text: string;
  isFinal?: boolean;
  confidence?: number;
}

function createResultEvent(
  segments: readonly MockSegment[]
): SpeechRecognitionEventLike {
  const results = segments.map((segment) => {
    const alternatives: SpeechRecognitionAlternativeLike[] = [
      {
        transcript: segment.text,
        confidence: segment.confidence ?? 0.9
      }
    ];
    return Object.assign(alternatives, {
      isFinal: segment.isFinal ?? false,
      item: (index: number) => alternatives[index] ?? null
    }) as SpeechRecognitionResultLike;
  });
  const resultList = Object.assign(results, {
    item: (index: number) => results[index] ?? null
  }) as SpeechRecognitionResultListLike;

  return { resultIndex: 0, results: resultList };
}

class MockRecognition implements SpeechRecognitionInstance {
  lang = 'ko-KR';
  interimResults = true;
  continuous = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  emitStart() {
    this.onstart?.();
  }

  emitResult(segments: readonly MockSegment[]) {
    this.onresult?.(createResultEvent(segments));
  }

  emitError(error: string, message = 'provider-private-message') {
    this.onerror?.({ error, message });
  }
}

function createHarness() {
  const instances: MockRecognition[] = [];
  const factory: SpeechRecognitionFactory = vi.fn(() => {
    const recognition = new MockRecognition();
    instances.push(recognition);
    return recognition;
  });

  return { factory, instances };
}

describe('F4_VoiceController', () => {
  it('고정 selector와 접근 가능한 대형 실제 버튼을 초기 상태에 맞게 표시한다', () => {
    const harness = createHarness();
    render(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={harness.factory}
      />
    );

    const controller = screen.getByRole('region', { name: '음성 입력' });
    expect(controller).toHaveAttribute('id', VOICE_CONTROLLER_SELECTORS.root);
    expect(controller).toHaveAttribute(
      'data-testid',
      VOICE_CONTROLLER_SELECTORS.root
    );
    expect(controller).toHaveAttribute('aria-busy', 'false');

    const start = screen.getByRole('button', { name: '음성 입력 시작' });
    const stop = screen.getByRole('button', { name: '음성 입력 중지' });
    const retry = screen.getByRole('button', { name: '다시 시도' });
    const clear = screen.getByRole('button', { name: '인식 내용 지우기' });
    for (const button of [start, stop, retry, clear]) {
      expect(button).toHaveAttribute('type', 'button');
      expect(button.className).toContain('min-h-14');
      expect(button.id).toBe(button.getAttribute('data-testid'));
    }
    expect(start).toBeEnabled();
    expect(start).toHaveAttribute('aria-pressed', 'false');
    expect(stop).toBeDisabled();
    expect(retry).toBeDisabled();
    expect(clear).toBeDisabled();
    expect(harness.factory).not.toHaveBeenCalled();
  });

  it('사용자 클릭에서만 시작하고 STARTING·LISTENING·STOPPING을 안내한다', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const onSttEvent = vi.fn<(event: SttEvent) => void>();
    render(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={harness.factory}
        onSttEvent={onSttEvent}
      />
    );

    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    const recognition = harness.instances[0];
    expect(recognition.start).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(
      '마이크 연결을 준비하고 있습니다.'
    );
    expect(screen.getByRole('region', { name: '음성 입력' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.getByRole('button', { name: '음성 입력 시작' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    act(() => recognition.emitStart());
    expect(screen.getByRole('status')).toHaveTextContent(
      '음성을 듣고 있습니다. 말씀해 주세요.'
    );
    expect(onSttEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STT_STARTED',
        sessionId: 'session-ui-test'
      })
    );

    await user.click(screen.getByRole('button', { name: '음성 입력 중지' }));
    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(
      '음성 입력을 마치는 중입니다.'
    );
  });

  it('partial과 final 결과를 live 정책에 맞게 표시하고 callback으로 전달한다', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const onSttEvent = vi.fn<(event: SttEvent) => void>();
    render(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={harness.factory}
        onSttEvent={onSttEvent}
      />
    );
    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));

    act(() =>
      harness.instances[0].emitResult([
        { text: '예금 상품을 찾아', confidence: 0.8 }
      ])
    );
    const interim = screen.getByTestId(
      VOICE_CONTROLLER_SELECTORS.interimTranscript
    );
    expect(interim).toHaveTextContent('예금 상품을 찾아');
    expect(interim).toHaveAttribute('aria-live', 'off');

    act(() =>
      harness.instances[0].emitResult([
        {
          text: '예금 상품을 찾아 주세요',
          isFinal: true,
          confidence: 0.9
        }
      ])
    );
    const final = screen.getByTestId(
      VOICE_CONTROLLER_SELECTORS.finalTranscript
    );
    expect(final).toHaveTextContent('예금 상품을 찾아 주세요');
    expect(final).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent(
      '음성 인식이 완료되었습니다.'
    );
    expect(onSttEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STT_PARTIAL_RESULT',
        text: '예금 상품을 찾아'
      })
    );
    expect(onSttEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STT_FINAL_RESULT',
        text: '예금 상품을 찾아 주세요'
      })
    );

    await user.click(screen.getByRole('button', { name: '인식 내용 지우기' }));
    expect(final).toHaveTextContent('아직 완료된 인식 결과가 없습니다.');
  });

  it('재시도 가능한 오류는 안전한 alert와 retry 동작을 제공한다', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    render(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={harness.factory}
      />
    );
    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    act(() => harness.instances[0].emitError('network'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '음성 인식 서비스에 연결할 수 없습니다.'
    );
    expect(screen.queryByText('provider-private-message')).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: '다시 시도' });
    expect(retry).toBeEnabled();
    await user.click(retry);
    expect(harness.instances).toHaveLength(2);
    expect(harness.instances[1].start).toHaveBeenCalledOnce();
  });

  it('권한 오류는 retry를 비활성화하고 unsupported 대안을 표시한다', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const { unmount } = render(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={harness.factory}
      />
    );
    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    act(() => harness.instances[0].emitError('not-allowed'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      '마이크 사용 권한을 확인해 주세요.'
    );
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeDisabled();

    unmount();
    render(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={null}
      />
    );
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.unsupportedNotice)
    ).toHaveTextContent('텍스트 입력으로 진행해 주세요.');
    expect(screen.getByRole('button', { name: '음성 입력 시작' })).toBeDisabled();
  });

  it('secure 전환 즉시 abort·transcript 삭제·버튼 차단을 수행한다', async () => {
    const user = userEvent.setup();
    const harness = createHarness();
    const onSttEvent = vi.fn<(event: SttEvent) => void>();
    const { rerender } = render(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={harness.factory}
        onSttEvent={onSttEvent}
      />
    );
    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    const recognition = harness.instances[0];
    const staleResult = recognition.onresult;
    act(() => recognition.emitResult([{ text: '삭제할 내용' }]));

    rerender(
      <F4_VoiceController
        sessionId="session-ui-test"
        recognitionFactory={harness.factory}
        onSttEvent={onSttEvent}
        isSecureInput
      />
    );
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.secureDisabledNotice)
    ).toHaveTextContent('음성 입력이 중단되었습니다.');
    expect(screen.queryByText('삭제할 내용')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '음성 입력 시작' })).toBeDisabled();

    const callbackCount = onSttEvent.mock.calls.length;
    act(() =>
      staleResult?.(
        createResultEvent([{ text: '폐기할 결과', isFinal: true }])
      )
    );
    expect(onSttEvent).toHaveBeenCalledTimes(callbackCount);
    expect(screen.queryByText('폐기할 결과')).not.toBeInTheDocument();
  });

  it('disabled와 빈 sessionId에서 시작을 차단하고 외부 기능을 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    const webSocketMock = vi.fn();
    const speakMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', webSocketMock);
    vi.stubGlobal('speechSynthesis', { speak: speakMock });
    const disabledHarness = createHarness();
    const { unmount } = render(
      <F4_VoiceController
        sessionId="session-ui-test"
        disabled
        recognitionFactory={disabledHarness.factory}
      />
    );
    expect(screen.getByRole('button', { name: '음성 입력 시작' })).toBeDisabled();
    unmount();

    const blankHarness = createHarness();
    render(
      <F4_VoiceController sessionId="  " recognitionFactory={blankHarness.factory} />
    );
    const start = screen.getByRole('button', { name: '음성 입력 시작' });
    expect(start).toBeDisabled();
    await user.click(start);
    expect(disabledHarness.factory).not.toHaveBeenCalled();
    expect(blankHarness.factory).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(webSocketMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
