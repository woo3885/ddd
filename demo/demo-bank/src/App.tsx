import {
  createDepositConditionsPath,
  createDepositProductDetailPath,
  createDepositTermsPath,
  normalizePathname,
  ROUTES
} from './constants/routes';
import { depositProducts } from './data/demo-data';
import DepositAmountPage from './pages/DepositAmountPage';
import DepositProductDetailPage from './pages/DepositProductDetailPage';
import DepositProductsPage from './pages/DepositProductsPage';
import DepositTermsPage from './pages/DepositTermsPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import TransferAccountsPage from './pages/TransferAccountsPage';

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
