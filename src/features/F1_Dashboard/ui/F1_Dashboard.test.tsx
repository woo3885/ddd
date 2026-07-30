import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as orchestratorClient from '@/shared/api/orchestratorClient';
import F1_Dashboard from './F1_Dashboard';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('F1_Dashboard', () => {
  it('Dashboard와 데모 사이트, 두 업무 및 비거래 안내를 표시한다', () => {
    render(<F1_Dashboard />);

    expect(
      screen.getByRole('heading', { name: '금융 업무 시작' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('금융길잡이 데모뱅크')).toBeInTheDocument();
    expect(screen.getByText('예금 가입')).toBeInTheDocument();
    expect(screen.getByText('계좌이체')).toBeInTheDocument();
    expect(
      screen.getByRole('group', {
        name: '1. 이용할 사이트 선택'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', {
        name: '2. 진행할 업무 선택'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '현재는 시연용 데모 환경이며 실제 금융거래는 발생하지 않습니다.'
      )
    ).toBeInTheDocument();
  });

  it('초기에는 모든 radio가 선택 전이고 시작 버튼과 업무 radio가 비활성화된다', () => {
    render(<F1_Dashboard />);

    const siteRadio = screen.getByRole('radio', {
      name: /금융길잡이 데모뱅크/
    });
    const depositRadio = screen.getByRole('radio', {
      name: /예금 가입/
    });
    const transferRadio = screen.getByRole('radio', {
      name: /계좌이체/
    });

    expect(siteRadio).not.toBeChecked();
    expect(depositRadio).not.toBeChecked();
    expect(transferRadio).not.toBeChecked();
    expect(depositRadio).toBeDisabled();
    expect(transferRadio).toBeDisabled();
    const startButton = screen.getByRole('button', {
      name: '선택한 업무 시작'
    });
    expect(startButton).toBeDisabled();
    expect(startButton).toHaveAttribute('type', 'button');
    expect(startButton).toHaveClass('min-h-14');
  });

  it('사이트를 선택하면 업무를 선택할 수 있지만 시작 버튼은 계속 비활성화된다', async () => {
    const user = userEvent.setup();
    render(<F1_Dashboard />);

    const siteRadio = screen.getByRole('radio', {
      name: /금융길잡이 데모뱅크/
    });
    await user.click(siteRadio);

    expect(siteRadio).toBeChecked();
    expect(siteRadio.closest('label')).toHaveTextContent('선택됨');
    expect(
      screen.getByRole('radio', { name: /예금 가입/ })
    ).toBeEnabled();
    expect(
      screen.getByRole('radio', { name: /계좌이체/ })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: '선택한 업무 시작' })
    ).toBeDisabled();
  });

  it.each(['예금 가입', '계좌이체'] as const)(
    '사이트와 %s 업무를 선택하면 시작 버튼이 활성화된다',
    async (taskName) => {
      const user = userEvent.setup();
      render(<F1_Dashboard />);

      await user.click(
        screen.getByRole('radio', {
          name: /금융길잡이 데모뱅크/
        })
      );
      const taskRadio = screen.getByRole('radio', {
        name: new RegExp(taskName)
      });
      await user.click(taskRadio);

      expect(taskRadio).toBeChecked();
      expect(taskRadio.closest('label')).toHaveTextContent('선택됨');
      expect(
        screen.getByRole('button', { name: '선택한 업무 시작' })
      ).toBeEnabled();

      const selectionSummary = screen.getByRole('region', {
        name: '선택 결과'
      });
      expect(
        within(selectionSummary).getByText('금융길잡이 데모뱅크')
      ).toBeInTheDocument();
      expect(
        within(selectionSummary).getByText(taskName)
      ).toBeInTheDocument();
    }
  );

  it('키보드만으로 사이트와 업무를 선택할 수 있다', async () => {
    const user = userEvent.setup();
    render(<F1_Dashboard />);

    const siteRadio = screen.getByRole('radio', {
      name: /금융길잡이 데모뱅크/
    });
    const depositRadio = screen.getByRole('radio', {
      name: /예금 가입/
    });

    await user.tab();
    expect(siteRadio).toHaveFocus();
    await user.keyboard('[Space]');
    expect(siteRadio).toBeChecked();

    await user.tab();
    expect(depositRadio).toHaveFocus();
    await user.keyboard('[Space]');
    expect(depositRadio).toBeChecked();
  });

  it('예금 시작 시 선택값을 한 번 전달하고 API 없이 준비 상태를 안내한다', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const fetchMock = vi.fn();
    const webSocketMock = vi.fn();
    const createSessionSpy = vi.spyOn(
      orchestratorClient,
      'createStreamSession'
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', webSocketMock);
    render(<F1_Dashboard onStart={onStart} />);

    await user.click(
      screen.getByRole('radio', {
        name: /금융길잡이 데모뱅크/
      })
    );
    await user.click(
      screen.getByRole('radio', { name: /예금 가입/ })
    );
    await user.click(
      screen.getByRole('button', { name: '선택한 업무 시작' })
    );

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({
      siteId: 'demo-bank',
      taskType: 'OPEN_DEPOSIT'
    });
    expect(
      screen.getByRole('status')
    ).toHaveTextContent(
      '선택한 업무를 시작할 준비가 완료되었습니다.'
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
    expect(webSocketMock).not.toHaveBeenCalled();
    expect(
      screen.getByText('WorkflowStatus: SESSION_CREATED')
    ).toBeInTheDocument();
    expect(
      screen.getByText('WebSocket 연결 안 됨')
    ).toBeInTheDocument();
  });

  it('이체 시작 시 정확한 선택값을 전달하며 onStart가 없어도 동작한다', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const { rerender } = render(<F1_Dashboard onStart={onStart} />);

    await user.click(
      screen.getByRole('radio', {
        name: /금융길잡이 데모뱅크/
      })
    );
    await user.click(
      screen.getByRole('radio', { name: /계좌이체/ })
    );
    await user.click(
      screen.getByRole('button', { name: '선택한 업무 시작' })
    );

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({
      siteId: 'demo-bank',
      taskType: 'TRANSFER_MONEY'
    });

    rerender(<F1_Dashboard />);
    await user.click(
      screen.getByRole('button', { name: '선택한 업무 시작' })
    );
    expect(
      screen.getByRole('status')
    ).toHaveTextContent(
      '선택한 업무를 시작할 준비가 완료되었습니다.'
    );
  });

  it('고정 자동화 ID와 data-testid를 동일하게 유지한다', () => {
    render(<F1_Dashboard />);

    for (const testId of [
      'radio-site-demo-bank',
      'radio-task-open-deposit',
      'radio-task-transfer-money',
      'btn-start-financial-task'
    ]) {
      expect(screen.getByTestId(testId)).toHaveAttribute('id', testId);
    }

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.closest('label')).toHaveAttribute('for', radio.id);
      expect(radio).toHaveClass('focus-visible:ring-4');
    }
  });
});
