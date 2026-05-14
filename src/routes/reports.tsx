import { createFileRoute, Navigate } from '@tanstack/react-router';
import { ReportsPage } from '@/components/ReportsPage';
import { useAuth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/permissions';

export const Route = createFileRoute('/reports')({
  component: ReportsRoute,
});

function ReportsRoute() {
  const { isAuthenticated, user } = useAuth();

  // BARREIRA DE SEGURANÇA: 
  // Protege a rota de relatórios contra bisbilhoteiros.
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (!hasAnyRole(user, ['admin_loja'])) {
    return <Navigate to="/dashboard" />;
  }

  return <ReportsPage />;
}
