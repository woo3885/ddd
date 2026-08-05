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
  BUTTON_DEPOSIT_TERMS_START: 'btn-deposit-terms-start',
  PAGE_DEPOSIT_TERMS: 'page-deposit-terms',
  SUMMARY_DEPOSIT_TERMS_PRODUCT_NAME:
    'summary-deposit-terms-product-name',
  TERM_SERVICE_REQUIRED: 'term-service-required',
  CHECKBOX_TERM_SERVICE_REQUIRED: 'checkbox-term-service-required',
  TERM_PRIVACY_REQUIRED: 'term-privacy-required',
  CHECKBOX_TERM_PRIVACY_REQUIRED: 'checkbox-term-privacy-required',
  TERM_MARKETING_OPTIONAL: 'term-marketing-optional',
  CHECKBOX_TERM_MARKETING_OPTIONAL: 'checkbox-term-marketing-optional',
  STATUS_DEPOSIT_TERMS_SELECTION: 'status-deposit-terms-selection',
  STATUS_DEPOSIT_TERMS_CONFIRMATION:
    'status-deposit-terms-confirmation',
  BUTTON_DEPOSIT_TERMS_CONFIRM: 'btn-deposit-terms-confirm',
  BUTTON_DEPOSIT_AMOUNT_BACK: 'btn-deposit-amount-back',
  ACCOUNT_LIVING_EXPENSE: 'account-living-expense',
  ACCOUNT_SAVINGS: 'account-savings',
  BUTTON_SELECT_ACCOUNT_LIVING_EXPENSE:
    'btn-select-account-living-expense',
  BUTTON_SELECT_ACCOUNT_SAVINGS: 'btn-select-account-savings',
  BUTTON_TRANSFER_ACCOUNT_NEXT: 'btn-transfer-account-next',
  PAGE_TRANSFER_RECIPIENTS: 'page-transfer-recipients',
  SUMMARY_TRANSFER_SOURCE_ACCOUNT: 'summary-transfer-source-account',
  RECIPIENT_HONG_GILDONG: 'recipient-hong-gildong',
  BUTTON_SELECT_RECIPIENT_HONG_GILDONG:
    'btn-select-recipient-hong-gildong',
  RECIPIENT_DEMO_SAVED: 'recipient-demo-saved',
  BUTTON_SELECT_RECIPIENT_DEMO_SAVED:
    'btn-select-recipient-demo-saved',
  STATUS_SELECTED_TRANSFER_RECIPIENT:
    'status-selected-transfer-recipient',
  STATUS_CONFIRMED_TRANSFER_RECIPIENT:
    'status-confirmed-transfer-recipient',
  BUTTON_TRANSFER_RECIPIENT_CONFIRM:
    'btn-transfer-recipient-confirm',
  BUTTON_TRANSFER_AMOUNT_START: 'btn-transfer-amount-start',
  BUTTON_TRANSFER_ACCOUNT_BACK: 'btn-transfer-account-back',
  PAGE_TRANSFER_AMOUNT: 'page-transfer-amount',
  SUMMARY_TRANSFER_AMOUNT_SOURCE_ACCOUNT:
    'summary-transfer-amount-source-account',
  SUMMARY_TRANSFER_AMOUNT_BALANCE:
    'summary-transfer-amount-balance',
  SUMMARY_TRANSFER_AMOUNT_RECIPIENT:
    'summary-transfer-amount-recipient',
  INPUT_TRANSFER_AMOUNT: 'input-transfer-amount',
  SUMMARY_TRANSFER_AMOUNT_FORMATTED:
    'summary-transfer-amount-formatted',
  STATUS_TRANSFER_AMOUNT_VALIDATION:
    'status-transfer-amount-validation',
  STATUS_CONFIRMED_TRANSFER_AMOUNT:
    'status-confirmed-transfer-amount',
  BUTTON_TRANSFER_AMOUNT_CONFIRM: 'btn-transfer-amount-confirm',
  BUTTON_TRANSFER_RECIPIENT_BACK: 'btn-transfer-recipient-back',
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
