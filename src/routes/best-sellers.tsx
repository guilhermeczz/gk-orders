import { createFileRoute, Navigate } from '@tanstack/react-router';
import { BestSellersPage } from '@/components/BestSellersPage';
import { useAuth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/permissions';

export const Route = createFileRoute('/best-sellers')({
  component: BestSellersRoute,
});

function BestSellersRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (!hasAnyRole(user, ['admin_loja', 'operador'])) {
    return <Navigate to="/dashboard" />;
  }

  return <BestSellersPage />;
}
