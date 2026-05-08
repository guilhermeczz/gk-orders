import { createFileRoute, Navigate } from '@tanstack/react-router';

import { PaidOrdersPage } from '@/components/PaidOrdersPage';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/paid-orders')({
  component: PaidOrdersRoute,
});

function PaidOrdersRoute() {
  const { isAuthenticated } = useAuth();

  // BARREIRA DE SEGURANÇA: 
  // Impede que usuários não autenticados acessem a rota e tentem carregar o componente.
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <PaidOrdersPage />;
}