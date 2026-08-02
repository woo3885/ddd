export const ROUTES = {
  HOME: '/',
  DEPOSIT_PRODUCTS: '/deposit/products',
  DEPOSIT_CONDITIONS: '/deposit/conditions',
  TRANSFER_ACCOUNTS: '/transfer/accounts'
} as const;

export type DemoBankRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function createDepositProductDetailPath(productId: string): string {
  return `${ROUTES.DEPOSIT_PRODUCTS}/${encodeURIComponent(productId)}`;
}

export function createDepositConditionsPath(productId: string): string {
  return `${ROUTES.DEPOSIT_CONDITIONS}/${encodeURIComponent(productId)}`;
}

export function normalizePathname(pathname: string): string {
  if (pathname === ROUTES.HOME) {
    return ROUTES.HOME;
  }

  const normalizedPathname = pathname.replace(/\/+$/u, '');
  return normalizedPathname || ROUTES.HOME;
}
