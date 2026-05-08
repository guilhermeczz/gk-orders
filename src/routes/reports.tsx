import { createFileRoute, Navigate } from '@tanstack/react-router';
import { ReportsPage } from '@/components/ReportsPage';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/reports')({
  component: ReportsRoute,
});

function ReportsRoute() {
  const { isAuthenticated } = useAuth();

  // BARREIRA DE SEGURANÇA: 
  // Protege a rota de relatórios contra bisbilhoteiros.
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <ReportsPage />;
}