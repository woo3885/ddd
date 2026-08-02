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
  BUTTON_DEPOSIT_PRODUCT_NEXT: 'btn-deposit-product-next',
  PAGE_DEPOSIT_PRODUCT_DETAIL: 'page-deposit-product-detail',
  SUMMARY_DEPOSIT_PRODUCT_NAME: 'summary-deposit-product-name',
  SUMMARY_DEPOSIT_PRODUCT_PERIOD: 'summary-deposit-product-period',
  SUMMARY_DEPOSIT_PRODUCT_RATE: 'summary-deposit-product-rate',
  SUMMARY_DEPOSIT_PRODUCT_MINIMUM_AMOUNT:
    'summary-deposit-product-minimum-amount',
  BUTTON_DEPOSIT_PRODUCT_LIST_BACK: 'btn-deposit-product-list-back',
  BUTTON_DEPOSIT_AMOUNT_START: 'btn-deposit-amount-start',
  STATUS_DEPOSIT_NEXT_STEP: 'status-deposit-next-step',
  PAGE_DEPOSIT_AMOUNT: 'page-deposit-amount',
  SUMMARY_DEPOSIT_AMOUNT_PRODUCT_NAME:
    'summary-deposit-amount-product-name',
  SUMMARY_DEPOSIT_AMOUNT_MINIMUM: 'summary-deposit-amount-minimum',
  INPUT_DEPOSIT_AMOUNT: 'input-deposit-amount',
  SUMMARY_DEPOSIT_AMOUNT_FORMATTED:
    'summary-deposit-amount-formatted',
  STATUS_DEPOSIT_AMOUNT_VALIDATION:
    'status-deposit-amount-validation',
  BUTTON_DEPOSIT_AMOUNT_CONFIRM: 'btn-deposit-amount-confirm',
  BUTTON_DEPOSIT_PRODUCT_DETAIL_BACK:
    'btn-deposit-product-detail-back',
  ACCOUNT_LIVING_EXPENSE: 'account-living-expense',
  ACCOUNT_SAVINGS: 'account-savings',
  BUTTON_SELECT_ACCOUNT_LIVING_EXPENSE:
    'btn-select-account-living-expense',
  BUTTON_SELECT_ACCOUNT_SAVINGS: 'btn-select-account-savings',
  STATUS_HOME_STATIC: 'status-home-static',
  STATUS_DEPOSIT_STATIC: 'status-deposit-static',
  STATUS_TRANSFER_STATIC: 'status-transfer-static',
  STATUS_SELECTED_DEPOSIT_PRODUCT: 'status-selected-deposit-product',
  STATUS_SELECTED_TRANSFER_ACCOUNT: 'status-selected-transfer-account'
} as const;

export function elementIdentity(id: string) {
  return {
    id,
    'data-testid': id
  };
}
