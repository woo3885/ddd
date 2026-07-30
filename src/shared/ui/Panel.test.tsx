import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Panel } from './Panel';

describe('Panel', () => {
  it('children을 표시한다', () => {
    render(
      <Panel>
        <p>패널 내용</p>
      </Panel>
    );

    expect(screen.getByText('패널 내용')).toBeInTheDocument();
  });

  it('title과 description을 표시하고 section에 접근성 관계를 연결한다', () => {
    render(
      <Panel title="거래 정보" description="내용을 확인해 주세요.">
        <p>거래 상세</p>
      </Panel>
    );

    const title = screen.getByRole('heading', { level: 2, name: '거래 정보' });
    const description = screen.getByText('내용을 확인해 주세요.');
    const section = screen.getByRole('region', { name: '거래 정보' });

    expect(section).toHaveAttribute('aria-labelledby', title.id);
    expect(section).toHaveAttribute('aria-describedby', description.id);
  });

  it('title과 description 없이도 section을 렌더링한다', () => {
    const { container } = render(<Panel>기본 패널</Panel>);
    const section = container.querySelector('section');

    expect(section).toBeInTheDocument();
    expect(section).not.toHaveAttribute('aria-labelledby');
    expect(section).not.toHaveAttribute('aria-describedby');
  });
});
