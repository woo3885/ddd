import { describe, expect, it } from 'vitest';

import {
  GUIDE_MESSAGE_MAX_LENGTH,
  GUIDE_MESSAGE_MIN_LENGTH,
  validateGuideMessage
} from './guide-message';

describe('validateGuideMessage', () => {
  it('15자는 유효하다', () => {
    const message = '가'.repeat(GUIDE_MESSAGE_MIN_LENGTH);

    expect(validateGuideMessage(message)).toEqual({
      normalizedMessage: message,
      length: 15,
      isValid: true,
      issues: []
    });
  });

  it('40자는 유효하다', () => {
    const message = '가'.repeat(GUIDE_MESSAGE_MAX_LENGTH);

    expect(validateGuideMessage(message)).toEqual({
      normalizedMessage: message,
      length: 40,
      isValid: true,
      issues: []
    });
  });

  it('14자는 TOO_SHORT를 반환한다', () => {
    const result = validateGuideMessage('가'.repeat(14));

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('TOO_SHORT');
  });

  it('41자는 TOO_LONG을 반환한다', () => {
    const result = validateGuideMessage('가'.repeat(41));

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('TOO_LONG');
  });

  it('빈 문자열은 EMPTY와 TOO_SHORT를 반환한다', () => {
    const result = validateGuideMessage('');

    expect(result.normalizedMessage).toBe('');
    expect(result.issues).toEqual(['EMPTY', 'TOO_SHORT']);
  });

  it('앞뒤 공백을 제거한 뒤 길이를 계산한다', () => {
    const message = '가'.repeat(15);
    const result = validateGuideMessage(`  ${message}  `);

    expect(result.normalizedMessage).toBe(message);
    expect(result.length).toBe(15);
    expect(result.isValid).toBe(true);
  });

  it('줄바꿈이 있으면 MULTILINE을 반환한다', () => {
    const result = validateGuideMessage(
      `${'가'.repeat(7)}\n${'나'.repeat(7)}`
    );

    expect(result.issues).toContain('MULTILINE');
    expect(result.isValid).toBe(false);
  });

  it('여러 문제가 있으면 issues에 모두 포함한다', () => {
    const result = validateGuideMessage('\n짧음\n');

    expect(result.issues).toEqual(['TOO_SHORT', 'MULTILINE']);
  });

  it('40자를 넘는 입력을 자동으로 자르지 않는다', () => {
    const message = '가'.repeat(41);
    const result = validateGuideMessage(message);

    expect(result.normalizedMessage).toBe(message);
    expect(result.length).toBe(41);
  });
});
