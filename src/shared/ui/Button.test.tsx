import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('기본 type과 children을 표시한다', () => {
    render(<Button>계속</Button>);

    const button = screen.getByRole('button', { name: '계속' });

    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveTextContent('계속');
  });

  it('variant와 size 스타일을 적용한다', () => {
    render(
      <Button variant="danger" size="lg">
        종료
      </Button>
    );

    expect(screen.getByRole('button', { name: '종료' })).toHaveClass(
      'bg-danger',
      'min-h-14',
      'text-lg'
    );
  });

  it('disabled 상태에서는 클릭되지 않는다', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        다음
      </Button>
    );

    const button = screen.getByRole('button', { name: '다음' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('loading 상태를 접근 가능하게 안내하고 클릭을 막는다', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        저장
      </Button>
    );

    const button = screen.getByRole('button', { name: /처리 중:\s*저장/ });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-live', 'polite');
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('추가 className을 기본 스타일 뒤에 적용한다', () => {
    render(<Button className="w-full">확인</Button>);

    expect(screen.getByRole('button', { name: '확인' })).toHaveClass(
      'bg-primary',
      'w-full'
    );
  });
});
