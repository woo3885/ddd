import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoticeBox } from './NoticeBox';

describe('NoticeBox', () => {
  it('title과 children을 표시한다', () => {
    render(
      <NoticeBox title="안내">현재 내용을 확인해 주세요.</NoticeBox>
    );

    expect(screen.getByText('안내')).toBeInTheDocument();
    expect(screen.getByText('현재 내용을 확인해 주세요.')).toBeInTheDocument();
  });

  it.each(['info', 'progress'] as const)(
    '%s variant에 status 역할을 사용한다',
    (variant) => {
      render(<NoticeBox variant={variant}>진행 안내</NoticeBox>);

      expect(screen.getByRole('status')).toHaveTextContent('진행 안내');
    }
  );

  it('danger variant에 alert 역할을 사용한다', () => {
    render(<NoticeBox variant="danger">위험 안내</NoticeBox>);

    expect(screen.getByRole('alert')).toHaveTextContent('위험 안내');
  });

  it.each([
    ['polite', 'polite'],
    ['assertive', 'assertive'],
    ['off', null]
  ] as const)('announce=%s 설정을 aria-live에 반영한다', (announce, expected) => {
    render(
      <NoticeBox announce={announce}>상태 안내</NoticeBox>
    );

    const notice = screen.getByRole('status');

    if (expected === null) {
      expect(notice).not.toHaveAttribute('aria-live');
    } else {
      expect(notice).toHaveAttribute('aria-live', expected);
    }
  });

  it('추가 className을 적용한다', () => {
    render(<NoticeBox className="w-full">추가 안내</NoticeBox>);

    expect(screen.getByRole('status')).toHaveClass('w-full');
  });
});
