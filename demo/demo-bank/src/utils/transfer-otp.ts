export type TransferOtpInputState = 'EMPTY' | 'ENTERED';

export function getTransferOtpInputState(
  hasInput: boolean
): TransferOtpInputState {
  return hasInput ? 'ENTERED' : 'EMPTY';
}
