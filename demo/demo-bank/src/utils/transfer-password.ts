export type TransferPasswordInputState = 'EMPTY' | 'ENTERED';

export function resolveTransferPasswordInputState(
  hasInput: boolean
): TransferPasswordInputState {
  return hasInput ? 'ENTERED' : 'EMPTY';
}
