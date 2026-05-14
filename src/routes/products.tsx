import { createFileRoute, Navigate } from '@tanstack/react-router';
import { ProductsPage } from '@/components/ProductsPage';
import { useAuth } from '@/lib/auth';
import { hasAnyRole } from '@/lib/permissions';

export const Route = createFileRoute('/products')({
  component: ProductsRoute,
});

function ProductsRoute() {
  const { isAuthenticated, user } = useAuth();

  // BARREIRA DE SEGURANÇA: 
  // Protege a rota contra acessos diretos pela URL por pessoas deslogadas.
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (!hasAnyRole(user, ['admin_loja', 'operador'])) {
    return <Navigate to="/dashboard" />;
  }

  return <ProductsPage />;
}
