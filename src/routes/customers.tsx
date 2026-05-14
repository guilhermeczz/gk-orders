import { createFileRoute, Navigate } from '@tanstack/react-router';
import { CustomersPage } from '@/components/CustomersPage';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/customers')({
  component: CustomersRoute,
});

function CustomersRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <CustomersPage />;
}
