export const ROUTES = {
  HOME: '/',
  DEPOSIT_PRODUCTS: '/deposit/products',
  DEPOSIT_CONDITIONS: '/deposit/conditions',
  DEPOSIT_TERMS: '/deposit/terms',
  TRANSFER_ACCOUNTS: '/transfer/accounts'
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

export function normalizePathname(pathname: string): string {
  if (pathname === ROUTES.HOME) {
    return ROUTES.HOME;
  }

  const normalizedPathname = pathname.replace(/\/+$/u, '');
  return normalizedPathname || ROUTES.HOME;
}
