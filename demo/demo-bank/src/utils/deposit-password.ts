export type DepositPasswordInputState = 'EMPTY' | 'ENTERED';

export function getDepositPasswordInputState(
  hasInput: boolean
): DepositPasswordInputState {
  return hasInput ? 'ENTERED' : 'EMPTY';
}
