import { useMemo, useState } from 'react';

import partialResultMock from '../../../../mocks/stt-partial-result.json';
import finalResultMock from '../../../../mocks/stt-final-result.json';
import {
  VOICE_CONTROLLER_PREVIEW_SELECTORS,
  type SpeechRecognitionAlternativeLike,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionFactory,
  type SpeechRecognitionInstance,
  type SpeechRecognitionResultLike,
  type SpeechRecognitionResultListLike
} from '@/features/F4_VoiceController/model/speech-recognition';
import { Button } from '@/shared/ui/Button';
import { NoticeBox } from '@/shared/ui/NoticeBox';
import { Panel } from '@/shared/ui/Panel';
import { Text } from '@/shared/ui/Text';
import type { SttEvent } from '@/types/stt-events';

import F4_VoiceController from './F4_VoiceController';

interface PreviewResult {
  text: string;
  isFinal: boolean;
  confidence: number | null;
}

class PreviewSpeechRecognition implements SpeechRecognitionInstance {
  lang = 'ko-KR';
  interimResults = true;
  continuous = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    this.onstart?.();
  }

  stop() {
    this.onend?.();
  }

  abort() {
    // Preview cleanup only. It does not access a browser microphone.
  }

  emitResult({ text, isFinal, confidence }: PreviewResult) {
    const alternatives: SpeechRecognitionAlternativeLike[] = [
      { transcript: text, confidence: confidence ?? Number.NaN }
    ];
    const result = Object.assign(alternatives, {
      isFinal,
      item: (index: number) => alternatives[index] ?? null
    }) as SpeechRecognitionResultLike;
    const results = Object.assign([result], {
      item: (index: number) => (index === 0 ? result : null)
    }) as SpeechRecognitionResultListLike;
    this.onresult?.({ resultIndex: 0, results });
  }

  emitError(error: string) {
    this.onerror?.({ error });
  }
}

class PreviewRecognitionHarness {
  current: PreviewSpeechRecognition | null = null;

  readonly factory: SpeechRecognitionFactory = () => {
    const recognition = new PreviewSpeechRecognition();
    this.current = recognition;
    return recognition;
  };
}

function elementIdentity(id: string) {
  return { id, 'data-testid': id };
}

export default function F4_VoiceControllerPreview() {
  const harness = useMemo(() => new PreviewRecognitionHarness(), []);
  const [lastEvent, setLastEvent] = useState<SttEvent | null>(null);
  const [isSecureInput, setIsSecureInput] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);

  return (
    <main
      {...elementIdentity(VOICE_CONTROLLER_PREVIEW_SELECTORS.root)}
      className="mx-auto w-full max-w-6xl space-y-6 p-6"
    >
      <Text variant="title">Web Speech STT 개발 Preview</Text>
      <NoticeBox variant="warning" title="개발 전용 Mock" announce="off">
        실제 마이크를 사용하지 않으며 인식 문장을 실제 AI 또는 서버로
        전송하지 않습니다.
      </NoticeBox>

      <Panel
        title="Mock 제어"
        description="먼저 음성 입력 시작을 누른 뒤 원하는 Mock 결과를 실행하세요."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="secondary"
            onClick={() =>
              harness.current?.emitResult({
                text: partialResultMock.text,
                isFinal: false,
                confidence: partialResultMock.confidence
              })
            }
          >
            Mock 중간 결과
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              harness.current?.emitResult({
                text: finalResultMock.text,
                isFinal: true,
                confidence: finalResultMock.confidence
              })
            }
          >
            Mock 최종 결과
          </Button>
          <Button
            variant="danger"
            onClick={() => harness.current?.emitError('no-speech')}
          >
            Mock 오류
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsSecureInput((current) => !current)}
          >
            보안 입력 {isSecureInput ? '끄기' : '켜기'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsUnsupported((current) => !current)}
          >
            미지원 상태 {isUnsupported ? '해제' : '확인'}
          </Button>
        </div>
      </Panel>

      <F4_VoiceController
        sessionId="preview-stt-session"
        isSecureInput={isSecureInput}
        recognitionFactory={isUnsupported ? null : harness.factory}
        onSttEvent={setLastEvent}
      />

      <Panel title="마지막 SttEvent">
        <p
          {...elementIdentity(VOICE_CONTROLLER_PREVIEW_SELECTORS.eventStatus)}
          role="status"
          aria-live="polite"
          className="break-words text-base leading-relaxed"
        >
          {lastEvent
            ? `${lastEvent.type}: ${'text' in lastEvent ? lastEvent.text : '이벤트가 생성되었습니다.'}`
            : '아직 생성된 이벤트가 없습니다.'}
        </p>
      </Panel>
    </main>
  );
}
