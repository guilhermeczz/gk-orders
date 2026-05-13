import { createFileRoute, Navigate } from '@tanstack/react-router';
import { DeliveryPage } from '@/components/DeliveryPage';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/delivery')({
  component: DeliveryRoute,
});

function DeliveryRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <DeliveryPage />;
}
