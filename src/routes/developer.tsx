import { createFileRoute, Navigate } from '@tanstack/react-router';
import { DeveloperPanel } from '../components/developer/DeveloperPanel';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/developer')({
  component: DeveloperPage,
});

function DeveloperPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const isDeveloper =
    String(user?.username || '').toLowerCase() === 'dev' ||
    String(user?.name || '').toLowerCase() === 'desenvolvedor';

  if (!isDeveloper) {
    return <Navigate to="/dashboard" />;
  }

  return <DeveloperPanel />;
}