import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  VOICE_CONTROLLER_PREVIEW_SELECTORS,
  VOICE_CONTROLLER_SELECTORS
} from '@/features/F4_VoiceController/model/speech-recognition';

import F4_VoiceControllerPreview from './F4_VoiceControllerPreview';

describe('F4_VoiceControllerPreview', () => {
  it('개발 전용 Mock과 초기 상태를 표시하며 실제 외부 기능을 사용하지 않는다', async () => {
    const user = userEvent.setup();
    const browserRecognition = vi.fn(() => {
      throw new Error('실제 브라우저 생성자는 사용하면 안 됩니다.');
    });
    const fetchMock = vi.fn();
    const webSocketMock = vi.fn();
    const speakMock = vi.fn();
    vi.stubGlobal('SpeechRecognition', browserRecognition);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', webSocketMock);
    vi.stubGlobal('speechSynthesis', { speak: speakMock });

    render(<F4_VoiceControllerPreview />);
    const preview = screen.getByTestId(
      VOICE_CONTROLLER_PREVIEW_SELECTORS.root
    );
    expect(preview).toHaveAttribute(
      'id',
      VOICE_CONTROLLER_PREVIEW_SELECTORS.root
    );
    expect(screen.getByText('개발 전용 Mock')).toBeInTheDocument();
    expect(screen.getByText(/실제 마이크를 사용하지 않으며/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.status)
    ).toHaveTextContent('음성을 듣고 있습니다. 말씀해 주세요.');
    expect(browserRecognition).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(webSocketMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('Mock start 후 partial과 final 결과 및 마지막 이벤트를 표시한다', async () => {
    const user = userEvent.setup();
    render(<F4_VoiceControllerPreview />);

    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    expect(screen.getByTestId(VOICE_CONTROLLER_PREVIEW_SELECTORS.eventStatus))
      .toHaveTextContent('STT_STARTED');

    await user.click(screen.getByRole('button', { name: 'Mock 중간 결과' }));
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.interimTranscript)
    ).toHaveTextContent('1년 동안 천만 원을');
    expect(screen.getByTestId(VOICE_CONTROLLER_PREVIEW_SELECTORS.eventStatus))
      .toHaveTextContent('STT_PARTIAL_RESULT');

    await user.click(screen.getByRole('button', { name: 'Mock 최종 결과' }));
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.finalTranscript)
    ).toHaveTextContent('정기예금에 가입하고 싶어');
    expect(screen.getByTestId(VOICE_CONTROLLER_PREVIEW_SELECTORS.eventStatus))
      .toHaveTextContent('STT_FINAL_RESULT');
  });

  it('Mock 오류를 안전한 alert와 마지막 STT_ERROR로 표시한다', async () => {
    const user = userEvent.setup();
    render(<F4_VoiceControllerPreview />);

    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    await user.click(screen.getByRole('button', { name: 'Mock 오류' }));

    expect(screen.getAllByRole('alert')[1]).toHaveTextContent(
      '음성이 들리지 않았습니다. 다시 말씀해 주세요.'
    );
    expect(screen.getByTestId(VOICE_CONTROLLER_PREVIEW_SELECTORS.eventStatus))
      .toHaveTextContent('STT_ERROR');
  });

  it('secure 전환은 transcript를 지우고 자동 재시작하지 않는다', async () => {
    const user = userEvent.setup();
    render(<F4_VoiceControllerPreview />);
    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    await user.click(screen.getByRole('button', { name: 'Mock 중간 결과' }));
    expect(screen.getByText('1년 동안 천만 원을')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '보안 입력 켜기' }));
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.secureDisabledNotice)
    ).toBeInTheDocument();
    expect(screen.queryByText('1년 동안 천만 원을')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '음성 입력 시작' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '보안 입력 끄기' }));
    expect(screen.getByRole('button', { name: '음성 입력 시작' })).toBeEnabled();
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.status)
    ).toHaveTextContent(
      '음성 입력을 시작할 수 있습니다.'
    );
  });

  it('clear와 unsupported 상태를 Preview에서 확인할 수 있다', async () => {
    const user = userEvent.setup();
    render(<F4_VoiceControllerPreview />);
    await user.click(screen.getByRole('button', { name: '음성 입력 시작' }));
    await user.click(screen.getByRole('button', { name: 'Mock 최종 결과' }));
    await user.click(screen.getByRole('button', { name: '인식 내용 지우기' }));
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.finalTranscript)
    ).toHaveTextContent('아직 완료된 인식 결과가 없습니다.');

    await user.click(screen.getByRole('button', { name: '미지원 상태 확인' }));
    expect(
      screen.getByTestId(VOICE_CONTROLLER_SELECTORS.unsupportedNotice)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '음성 입력 시작' })).toBeDisabled();
  });
});
