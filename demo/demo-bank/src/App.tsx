import {
  createDepositConditionsPath,
  createDepositProductDetailPath,
  createDepositTermsPath,
  createTransferAmountPath,
  createTransferOtpPath,
  createTransferPasswordPath,
  createTransferRecipientsPath,
  normalizePathname,
  ROUTES
} from './constants/routes';
import { demoAccounts, depositProducts } from './data/demo-data';
import { transferRecipients } from './data/transfer-recipients';
import DepositAmountPage from './pages/DepositAmountPage';
import DepositProductDetailPage from './pages/DepositProductDetailPage';
import DepositProductsPage from './pages/DepositProductsPage';
import DepositTermsPage from './pages/DepositTermsPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import TransferAccountsPage from './pages/TransferAccountsPage';
import TransferAmountPage from './pages/TransferAmountPage';
import TransferOtpPage from './pages/TransferOtpPage';
import TransferPasswordPage from './pages/TransferPasswordPage';
import TransferRecipientsPage from './pages/TransferRecipientsPage';

export default function App() {
  const currentPath = normalizePathname(window.location.pathname);
  const detailProduct = depositProducts.find(
    (product) =>
      createDepositProductDetailPath(product.id) === currentPath
  );
  const conditionsProduct = depositProducts.find(
    (product) =>
      createDepositConditionsPath(product.id) === currentPath
  );
  const termsProduct = depositProducts.find(
    (product) => createDepositTermsPath(product.id) === currentPath
  );
  const transferAccount = demoAccounts.find(
    (account) =>
      createTransferRecipientsPath(account.id) === currentPath
  );
  const transferAmountContext = demoAccounts
    .flatMap((account) =>
      transferRecipients.map((recipient) => ({ account, recipient }))
    )
    .find(
      ({ account, recipient }) =>
        createTransferAmountPath(account.id, recipient.id) === currentPath
    );
  const transferPasswordContext = demoAccounts
    .flatMap((account) =>
      transferRecipients.map((recipient) => ({ account, recipient }))
    )
    .find(
      ({ account, recipient }) =>
        createTransferPasswordPath(account.id, recipient.id) === currentPath
    );
  const transferOtpContext = demoAccounts
    .flatMap((account) =>
      transferRecipients.map((recipient) => ({ account, recipient }))
    )
    .find(
      ({ account, recipient }) =>
        createTransferOtpPath(account.id, recipient.id) === currentPath
    );

  if (transferOtpContext) {
    return (
      <TransferOtpPage
        account={transferOtpContext.account}
        recipient={transferOtpContext.recipient}
      />
    );
  }

  if (transferPasswordContext) {
    return (
      <TransferPasswordPage
        account={transferPasswordContext.account}
        recipient={transferPasswordContext.recipient}
      />
    );
  }

  if (transferAmountContext) {
    return (
      <TransferAmountPage
        account={transferAmountContext.account}
        recipient={transferAmountContext.recipient}
      />
    );
  }

  if (transferAccount) {
    return <TransferRecipientsPage account={transferAccount} />;
  }

  if (termsProduct) {
    return <DepositTermsPage product={termsProduct} />;
  }

  if (conditionsProduct) {
    return <DepositAmountPage product={conditionsProduct} />;
  }

  if (detailProduct) {
    return <DepositProductDetailPage product={detailProduct} />;
  }

  switch (currentPath) {
    case ROUTES.HOME:
      return <HomePage />;
    case ROUTES.DEPOSIT_PRODUCTS:
      return <DepositProductsPage />;
    case ROUTES.TRANSFER_ACCOUNTS:
      return <TransferAccountsPage />;
    default:
      return <NotFoundPage currentPath={currentPath} />;
  }
}
