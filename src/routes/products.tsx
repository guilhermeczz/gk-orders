import { createFileRoute, Navigate } from '@tanstack/react-router';
import { ProductsPage } from '@/components/ProductsPage';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/products')({
  component: ProductsRoute,
});

function ProductsRoute() {
  const { isAuthenticated } = useAuth();

  // BARREIRA DE SEGURANÇA: 
  // Protege a rota contra acessos diretos pela URL por pessoas deslogadas.
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <ProductsPage />;
}