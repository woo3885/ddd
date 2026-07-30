import { normalizePathname, ROUTES } from './constants/routes';
import DepositProductsPage from './pages/DepositProductsPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import TransferAccountsPage from './pages/TransferAccountsPage';

export default function App() {
  const currentPath = normalizePathname(window.location.pathname);

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
