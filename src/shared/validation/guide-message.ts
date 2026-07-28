export const GUIDE_MESSAGE_MIN_LENGTH = 15;
export const GUIDE_MESSAGE_MAX_LENGTH = 40;

export type GuideMessageValidationIssue =
  | 'EMPTY'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'MULTILINE';

export interface GuideMessageValidationResult {
  normalizedMessage: string;
  length: number;
  isValid: boolean;
  issues: GuideMessageValidationIssue[];
}

export function validateGuideMessage(
  message: string
): GuideMessageValidationResult {
  const normalizedMessage = message.trim();
  const length = Array.from(normalizedMessage).length;
  const issues: GuideMessageValidationIssue[] = [];

  if (length === 0) {
    issues.push('EMPTY');
  }

  if (length < GUIDE_MESSAGE_MIN_LENGTH) {
    issues.push('TOO_SHORT');
  }

  if (length > GUIDE_MESSAGE_MAX_LENGTH) {
    issues.push('TOO_LONG');
  }

  if (/[\r\n]/u.test(message)) {
    issues.push('MULTILINE');
  }

  return {
    normalizedMessage,
    length,
    isValid: issues.length === 0,
    issues
  };
}
