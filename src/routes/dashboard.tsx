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
  const { products, mesas } = useAppStore();

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);

  const initialCart = useMemo(() => {
    if (!editOrder) return EMPTY_CART;

    const cart: Record<string, number> = {};

    editOrder.items.forEach((item) => {
      if (item.productId && products.some((p) => String(p.id) === String(item.productId))) {
        cart[String(item.productId)] = item.quantity;
      } else {
        const fallback = products.find((p) => p.name === item.productName);
        if (fallback) {
          cart[String(fallback.id)] = item.quantity;
        }
      }
    });

    return cart;
  }, [editOrder, products]);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleNewOrder = () => {
    setEditOrder(null);

    if (!mesas || mesas.length === 0) {
      toast.error('Cadastre pelo menos uma mesa antes de abrir um pedido.');
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