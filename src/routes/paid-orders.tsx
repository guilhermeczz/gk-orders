import { createFileRoute, Navigate } from '@tanstack/react-router';

import { PaidOrdersPage } from '@/components/PaidOrdersPage';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/paid-orders')({
  component: PaidOrdersRoute,
});

function PaidOrdersRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <PaidOrdersPage />;
}