import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  StatusBadge,
  type StatusBadgeVariant
} from './StatusBadge';

const variantCases: Array<[StatusBadgeVariant, string]> = [
  ['neutral', 'bg-slate-100'],
  ['success', 'bg-emerald-50'],
  ['progress', 'bg-brand-50'],
  ['secure', 'bg-slate-100'],
  ['warning', 'bg-amber-50'],
  ['danger', 'bg-red-50']
];

describe('StatusBadge', () => {
  it('children과 기본 neutral variant를 표시한다', () => {
    render(<StatusBadge>대기 중</StatusBadge>);

    expect(screen.getByText('대기 중')).toHaveClass('border-slate-400');
  });

  it.each(variantCases)(
    '%s variant 스타일을 적용한다',
    (variant, expectedClass) => {
      render(<StatusBadge variant={variant}>{variant}</StatusBadge>);

      expect(screen.getByText(variant)).toHaveClass(expectedClass);
    }
  );

  it('추가 className을 적용한다', () => {
    render(<StatusBadge className="uppercase">연결됨</StatusBadge>);

    expect(screen.getByText('연결됨')).toHaveClass('uppercase');
  });

  it('장식용 점을 접근성 트리에서 제외한다', () => {
    const { container } = render(<StatusBadge>진행 중</StatusBadge>);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
