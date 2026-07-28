import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Text, type TextVariant } from './Text';

const variantCases: Array<{
  variant: TextVariant;
  tagName: string;
  content: string;
}> = [
  { variant: 'title', tagName: 'H1', content: '화면 제목' },
  { variant: 'heading', tagName: 'H2', content: '영역 제목' },
  { variant: 'body', tagName: 'P', content: '일반 본문' },
  { variant: 'guide', tagName: 'P', content: '현재 작업을 확인해 주세요.' },
  { variant: 'caption', tagName: 'SPAN', content: '보조 설명' }
];

describe('Text', () => {
  it.each(variantCases)(
    '$variant variant를 기본 $tagName 태그로 표시한다',
    ({ variant, tagName, content }) => {
      render(<Text variant={variant}>{content}</Text>);

      expect(screen.getByText(content).tagName).toBe(tagName);
    }
  );

  it('as prop으로 기본 태그를 변경한다', () => {
    render(
      <Text variant="title" as="h3">
        단계 제목
      </Text>
    );

    expect(screen.getByRole('heading', { level: 3, name: '단계 제목' })).toBeInTheDocument();
  });

  it('caption에 14px인 text-sm을 사용하고 더 작은 글자 스타일은 사용하지 않는다', () => {
    render(<Text variant="caption">보조 안내</Text>);

    const caption = screen.getByText('보조 안내');

    expect(caption).toHaveClass('text-sm');
    expect(caption).not.toHaveClass('text-xs');
  });
});
