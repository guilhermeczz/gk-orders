import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { MesaDashboard } from '@/components/MesaDashboard';
import { NewOrderModal } from '@/components/NewOrderModal';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import type { Order } from '@/lib/types';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

const EMPTY_CART: Record<string, number> = {};

function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  
  // ADICIONADO: lojaAtualId extraído para blindagem multi-loja
  const { products, mesas, lojaAtualId } = useAppStore();

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);

  // =========================================================================
  // OTIMIZAÇÃO: Uso de Maps para busca instantânea O(1) de produtos
  // =========================================================================
  const initialCart = useMemo(() => {
    if (!editOrder) return EMPTY_CART;

    const cart: Record<string, number> = {};
    
    // Cria mapas de busca rápida na memória
    const productById = new Map(products.map(p => [String(p.id), p]));
    const productByName = new Map(products.map(p => [p.name, p]));

    editOrder.items.forEach((item) => {
      // Busca instantânea pelo ID
      if (item.productId && productById.has(String(item.productId))) {
        cart[String(item.productId)] = item.quantity;
      } else {
        // Busca instantânea (fallback) pelo nome
        const fallback = productByName.get(item.productName);
        if (fallback) {
          cart[String(fallback.id)] = item.quantity;
        }
      }
    });

    return cart;
  }, [editOrder, products]);

  // Trava de segurança principal de rotas
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleNewOrder = () => {
    // BLINDAGEM: Impede abrir um pedido se o sistema não reconhecer a loja logada
    if (!lojaAtualId) {
      toast.error('Erro de sessão: Nenhuma loja vinculada.');
      return;
    }

    setEditOrder(null);

    if (!mesas || mesas.length === 0) {
      toast.error('Cadastre pelo menos uma mesa antes de abrir um pedido.');
      // Permite abrir o modal mesmo assim, pois o usuário pode criar retirada
      setOrderModalOpen(true);
      return;
    }

    setOrderModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditOrder(order);
    setOrderModalOpen(true);
  };

  const handleCloseModal = () => {
    setOrderModalOpen(false);
    setEditOrder(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <AppHeader onNewOrder={handleNewOrder} />
      </div>

      <main className="pt-[195px] px-4 md:px-6 pb-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8 print:hidden">
          <div className="bg-background pt-2">
            <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">
              Painel Diário
            </h2>

            <p className="text-3xl font-bold text-foreground">
              Olá, {user?.name || 'Operador'}! 👋
            </p>
          </div>
        </div>

        <MesaDashboard />
      </main>

      <NewOrderModal
        open={orderModalOpen}
        onClose={handleCloseModal}
        editOrderId={editOrder?.id}
        initialCustomerName={editOrder?.customerName}
        initialCart={initialCart}
        initialNotes={editOrder?.notes}
        mesaId={editOrder?.mesaId ?? null}
      />
    </div>
  );
}