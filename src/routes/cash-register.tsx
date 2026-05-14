import { createFileRoute, Navigate } from '@tanstack/react-router';
import { CashRegisterPage } from '@/components/CashRegisterPage';
import { useAuth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/permissions';

// Arquivo de rota 100% otimizado. 
// A lógica multi-loja e de banco de dados fica toda dentro do componente CashRegisterPage.
export const Route = createFileRoute('/cash-register')({
  component: CashRegisterRoute,
});

function CashRegisterRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (!hasAnyRole(user, ['admin_loja'])) {
    return <Navigate to="/dashboard" />;
  }

  return <CashRegisterPage />;
}
