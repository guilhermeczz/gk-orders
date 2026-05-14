import { createFileRoute, Navigate } from '@tanstack/react-router';
import { BestSellersPage } from '@/components/BestSellersPage';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/best-sellers')({
  component: BestSellersRoute,
});

function BestSellersRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <BestSellersPage />;
}
