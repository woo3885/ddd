export const ROUTES = {
  HOME: '/',
  DEPOSIT_PRODUCTS: '/deposit/products',
  DEPOSIT_CONDITIONS: '/deposit/conditions',
  DEPOSIT_TERMS: '/deposit/terms',
  TRANSFER_ACCOUNTS: '/transfer/accounts',
  TRANSFER_RECIPIENTS: '/transfer/recipients',
  TRANSFER_AMOUNT: '/transfer/amount',
  TRANSFER_SECURE_PASSWORD: '/transfer/secure/password'
} as const;

export type DemoBankRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function createDepositProductDetailPath(productId: string): string {
  return `${ROUTES.DEPOSIT_PRODUCTS}/${encodeURIComponent(productId)}`;
}

export function createDepositConditionsPath(productId: string): string {
  return `${ROUTES.DEPOSIT_CONDITIONS}/${encodeURIComponent(productId)}`;
}

export function createDepositTermsPath(productId: string): string {
  return `${ROUTES.DEPOSIT_TERMS}/${encodeURIComponent(productId)}`;
}

export function createTransferRecipientsPath(accountId: string): string {
  return `${ROUTES.TRANSFER_RECIPIENTS}/${encodeURIComponent(accountId)}`;
}

export function createTransferAmountPath(
  accountId: string,
  recipientId: string
): string {
  return `${ROUTES.TRANSFER_AMOUNT}/${encodeURIComponent(accountId)}/${encodeURIComponent(recipientId)}`;
}

export function createTransferPasswordPath(
  accountId: string,
  recipientId: string
): string {
  return `${ROUTES.TRANSFER_SECURE_PASSWORD}/${encodeURIComponent(accountId)}/${encodeURIComponent(recipientId)}`;
}

export function normalizePathname(pathname: string): string {
  if (pathname === ROUTES.HOME) {
    return ROUTES.HOME;
  }

  const normalizedPathname = pathname.replace(/\/+$/u, '');
  return normalizedPathname || ROUTES.HOME;
}
