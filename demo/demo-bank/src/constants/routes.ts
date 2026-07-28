export const ROUTES = {
  HOME: '/',
  DEPOSIT_PRODUCTS: '/deposit/products',
  TRANSFER_ACCOUNTS: '/transfer/accounts'
} as const;

export type DemoBankRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function normalizePathname(pathname: string): string {
  if (pathname === ROUTES.HOME) {
    return ROUTES.HOME;
  }

  const normalizedPathname = pathname.replace(/\/+$/u, '');
  return normalizedPathname || ROUTES.HOME;
}
