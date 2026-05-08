import { createFileRoute, Navigate } from '@tanstack/react-router';
import { DeveloperPanel } from '../components/developer/DeveloperPanel';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/developer')({
  component: DeveloperPage,
});

function DeveloperPage() {
  const { isAuthenticated, user } = useAuth();

  // 1ª Barreira: O usuário precisa estar logado
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  // 2ª Barreira: Verificação rigorosa de autorização
  // Agora verificamos também pelo 'perfil', que é a forma mais segura no banco de dados
  const isDeveloper =
    String(user?.perfil || '').toLowerCase() === 'desenvolvedor' ||
    String(user?.username || '').toLowerCase() === 'dev' ||
    String(user?.name || '').toLowerCase() === 'desenvolvedor';

  if (!isDeveloper) {
    return <Navigate to="/dashboard" />;
  }

  // Acesso concedido!
  return <DeveloperPanel />;
}