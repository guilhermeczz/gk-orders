import { useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { NewOrderModal } from '@/components/NewOrderModal';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { DeliveryStatus, Order } from '@/lib/types';
import { Bike, Clock, Flame, MapPinned, CheckCircle2, Plus, Phone, Wallet, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { buildDeliveryOutMessage, buildWhatsappUrl } from '@/lib/whatsapp';

const deliveryColumns: Array<{ status: DeliveryStatus; title: string; icon: any }> = [
  { status: 'pendente', title: 'Pendente', icon: Clock },
  { status: 'preparo', title: 'Em Preparo', icon: Flame },
  { status: 'rota', title: 'Em Rota de Entrega', icon: Bike },
  { status: 'finalizado', title: 'Finalizado', icon: CheckCircle2 },
];

const nextStatus: Record<DeliveryStatus, DeliveryStatus | null> = {
  pendente: 'preparo',
  preparo: 'rota',
  rota: 'finalizado',
  finalizado: null,
};

const actionLabel: Record<DeliveryStatus, string> = {
  pendente: 'Iniciar preparo',
  preparo: 'Saiu para entrega',
  rota: 'Finalizar',
  finalizado: 'Finalizado',
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getOperationalDayStart = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(3, 0, 0, 0);

  if (now < start) {
    start.setDate(start.getDate() - 1);
  }

  return start;
};

export function DeliveryPage() {
  const { orders, lojaAtualId, fetchData } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const deliveryOrders = useMemo(() => {
    return orders
      .filter((order) => order.tipoPedido === 'delivery')
      .filter((order) => !lojaAtualId || String(order.loja_id) === String(lojaAtualId))
      .filter((order) => {
        if (order.statusEntrega !== 'finalizado') return true;
        return new Date(order.paidAt || order.createdAt).getTime() >= getOperationalDayStart().getTime();
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, lojaAtualId]);

  const grouped = useMemo(() => {
    return deliveryColumns.reduce<Record<DeliveryStatus, Order[]>>((acc, column) => {
      acc[column.status] = deliveryOrders.filter(
        (order) => (order.statusEntrega || 'pendente') === column.status
      );
      return acc;
    }, {} as Record<DeliveryStatus, Order[]>);
  }, [deliveryOrders]);

  const updateStatus = async (order: Order, status: DeliveryStatus) => {
    if (!lojaAtualId) return toast.error('Loja não identificada.');

    setUpdatingId(order.id);
    try {
      const paymentMethod = order.metadataDelivery?.formaPagamento || order.paymentMethod || null;
      const amountReceived =
        paymentMethod === 'dinheiro'
          ? Number(order.metadataDelivery?.trocoPara || order.total || 0)
          : Number(order.total || 0);
      const changeGiven =
        paymentMethod === 'dinheiro'
          ? Math.max(0, amountReceived - Number(order.total || 0))
          : 0;
      const shouldMarkPaid = status === 'finalizado' && !order.paid && order.statusPagamento === 'a_cobrar';

      const { error } = await supabase
        .from('pedidos')
        .update({
          status_entrega: status,
          ...(shouldMarkPaid
            ? {
                status: 'paid',
                pago: true,
                forma_pagamento: paymentMethod,
                paid_at: new Date().toISOString(),
                amount_received: amountReceived,
                change_given: changeGiven,
              }
            : {}),
        })
        .eq('loja_id', lojaAtualId)
        .eq('id', order.id);

      if (error) throw error;

      await fetchData();
      toast.success('Status do delivery atualizado.');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível atualizar o delivery.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openDeliveryMessage = (order: Order) => {
    const phone = order.metadataDelivery?.whatsapp || order.clienteTelefone || '';

    if (!phone) {
      toast.error('Este pedido não tem WhatsApp cadastrado.');
      return;
    }

    window.open(buildWhatsappUrl(phone, buildDeliveryOutMessage(order)), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <AppHeader />
      </div>

      <main className="pt-24 px-4 md:px-6 pb-8 max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">
              Delivery Próprio
            </p>
            <h1 className="text-3xl font-black text-foreground">Entregas da Loja</h1>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-black shadow-md transition-all hover:opacity-90 active:scale-95"
          >
            <Plus className="h-5 w-5" /> Novo Delivery
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {deliveryColumns.map((column) => {
            const Icon = column.icon;
            const columnOrders = grouped[column.status] || [];

            return (
              <section key={column.status} className="min-h-[420px] rounded-2xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
                      {column.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnOrders.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm font-bold text-muted-foreground">
                      Nenhum delivery
                    </div>
                  )}

                  {columnOrders.map((order) => {
                    const meta = order.metadataDelivery;
                    const endereco = meta?.endereco;
                    const next = nextStatus[column.status];

                    return (
                      <article key={order.id} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-primary">
                              #{String(order.number || 0).padStart(4, '0')}
                            </p>
                            <h3 className="mt-1 font-black text-foreground">{order.customerName}</h3>
                          </div>
                          <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-black text-primary">
                            {formatMoney(order.total)}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs font-bold text-muted-foreground">
                          {meta?.whatsapp && (
                            <p className="flex gap-2">
                              <Phone className="h-4 w-4 text-primary" /> {meta.whatsapp}
                            </p>
                          )}
                          {endereco && (
                            <p className="flex gap-2">
                              <MapPinned className="h-4 w-4 shrink-0 text-primary" />
                              <span>
                                {endereco.rua}, {endereco.numero} - {endereco.bairro}
                                {endereco.complemento ? ` - ${endereco.complemento}` : ''}
                              </span>
                            </p>
                          )}
                          <p className="flex gap-2">
                            <Wallet className="h-4 w-4 text-primary" />
                            {order.statusPagamento === 'pago' ? 'Já pago' : 'A cobrar'}
                            {order.taxaEntrega ? ` · taxa ${formatMoney(order.taxaEntrega)}` : ''}
                          </p>
                        </div>

                        {next && (
                          <div className="mt-4 grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => updateStatus(order, next)}
                              className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                            >
                              {actionLabel[column.status]}
                            </button>

                            {column.status === 'preparo' && (
                              <button
                                type="button"
                                onClick={() => openDeliveryMessage(order)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-black text-green-400 transition-all hover:bg-green-500/20"
                              >
                                <MessageCircle className="h-4 w-4" /> Mensagem: saiu para entrega
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <NewOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        forceOrderType="Delivery"
        hideOrderTypeSelector
      />
    </div>
  );
}
