import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import FrontendWireframeGallery from './FrontendWireframeGallery';

async function selectMockScreen(screenType: string) {
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText('Mock ScreenType'), screenType);
  return user;
}

describe('FrontendWireframeGallery', () => {
  it('개발용 선택기로 화면 상태 Mock을 전환한다', async () => {
    render(<FrontendWireframeGallery />);

    expect(screen.getByText('WorkflowStatus: SESSION_CREATED')).toBeInTheDocument();
    await selectMockScreen('AI_PROGRESS');

    expect(screen.getByText('WorkflowStatus: AI_EXECUTING')).toBeInTheDocument();
    expect(screen.getByText('Target Highlight')).toBeInTheDocument();
  });

  it('필수 약관에 모두 동의하기 전에는 다음 버튼을 비활성화한다', async () => {
    render(<FrontendWireframeGallery />);
    const user = await selectMockScreen('TERMS_AGREEMENT');
    const nextButton = screen.getByRole('button', { name: '다음' });

    expect(nextButton).toBeDisabled();

    const requiredTerms = screen.getAllByRole('checkbox').slice(0, 2);
    await user.click(requiredTerms[0]);
    await user.click(requiredTerms[1]);

    expect(nextButton).toBeEnabled();
  });

  it('보안 입력 화면에 실제 입력 요소를 만들지 않는다', async () => {
    const { container } = render(<FrontendWireframeGallery />);
    await selectMockScreen('ACCOUNT_PASSWORD');

    expect(container.querySelector('input[type="password"]')).not.toBeInTheDocument();
    expect(screen.getByText('AI 작업 중단')).toBeInTheDocument();
    expect(screen.getByText('화면 캡처 중단')).toBeInTheDocument();
  });

  it('최종 승인 전에는 금융 승인 버튼을 비활성화한다', async () => {
    render(<FrontendWireframeGallery />);
    const user = await selectMockScreen('TRANSFER_CONFIRMATION');
    const approvalButton = screen.getByRole('button', {
      name: '최종 승인 및 송금'
    });

    expect(approvalButton).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', {
        name: '위 내용을 확인했으며 최종 실행에 동의합니다.'
      })
    );

    expect(approvalButton).toBeEnabled();
  });

  it('위험 경고 화면에는 송금 실행 버튼을 표시하지 않는다', async () => {
    render(<FrontendWireframeGallery />);
    await selectMockScreen('VOICE_PHISHING_WARNING');
    const warningScreen = screen.getByLabelText('VOICE_PHISHING_WARNING Mock 화면');

    expect(
      within(warningScreen).queryByRole('button', { name: /송금|이체|승인/ })
    ).not.toBeInTheDocument();
    expect(within(warningScreen).getByRole('button', { name: '세션 종료' })).toBeInTheDocument();
  });
});
