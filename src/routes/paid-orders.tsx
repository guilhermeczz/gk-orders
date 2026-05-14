import { createFileRoute, Navigate } from '@tanstack/react-router';

import { PaidOrdersPage } from '@/components/PaidOrdersPage';
import { useAuth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/permissions';

export const Route = createFileRoute('/paid-orders')({
  component: PaidOrdersRoute,
});

function PaidOrdersRoute() {
  const { isAuthenticated, user } = useAuth();

  // BARREIRA DE SEGURANÇA: 
  // Impede que usuários não autenticados acessem a rota e tentem carregar o componente.
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (!hasAnyRole(user, ['admin_loja'])) {
    return <Navigate to="/dashboard" />;
  }

  return <PaidOrdersPage />;
}
