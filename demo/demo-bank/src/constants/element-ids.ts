export const ELEMENT_IDS = {
  PAGE_HOME: 'page-home',
  PAGE_DEPOSIT_PRODUCTS: 'page-deposit-products',
  PAGE_TRANSFER_ACCOUNTS: 'page-transfer-accounts',
  PAGE_NOT_FOUND: 'page-not-found',
  NAV_HOME: 'nav-home',
  NAV_DEPOSIT: 'nav-deposit',
  NAV_TRANSFER: 'nav-transfer',
  BUTTON_START_DEPOSIT: 'btn-start-deposit',
  BUTTON_START_TRANSFER: 'btn-start-transfer',
  PRODUCT_DEPOSIT_12M: 'product-deposit-12m',
  PRODUCT_DEPOSIT_PREFERRED: 'product-deposit-preferred',
  BUTTON_SELECT_DEPOSIT_12M: 'btn-select-deposit-12m',
  BUTTON_SELECT_DEPOSIT_PREFERRED: 'btn-select-deposit-preferred',
  ACCOUNT_LIVING_EXPENSE: 'account-living-expense',
  ACCOUNT_SAVINGS: 'account-savings',
  BUTTON_SELECT_ACCOUNT_LIVING_EXPENSE:
    'btn-select-account-living-expense',
  BUTTON_SELECT_ACCOUNT_SAVINGS: 'btn-select-account-savings',
  STATUS_HOME_STATIC: 'status-home-static',
  STATUS_DEPOSIT_STATIC: 'status-deposit-static',
  STATUS_TRANSFER_STATIC: 'status-transfer-static'
} as const;

export function elementIdentity(id: string) {
  return {
    id,
    'data-testid': id
  };
}
