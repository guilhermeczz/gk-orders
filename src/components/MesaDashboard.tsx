import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Search,
  Banknote,
  AlertTriangle,
  UtensilsCrossed,
  X,
  Plus,
  LayoutGrid,
  Pencil,
  Trash2,
  Printer,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Mesa, Order, OrderBatch, OrderItem } from '@/lib/types';
import { NewOrderModal } from './NewOrderModal';
import { useAuth } from '@/lib/auth';

const removerAcentos = (str: string) => {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const processarNota = (notes: string) => {
  if (!notes) return { tipo: '', textoObs: '' };

  const regex = /\[(LOCAL|RETIRADA)\]/i;
  const match = notes.match(regex);
  const tipo = match ? match[1].toUpperCase() : '';
  const textoObs = notes.replace(regex, '').trim();

  return { tipo, textoObs };
};

function getItemAdditionsTotal(item: OrderItem) {
  return (item.additions ?? []).reduce(
    (sum, addition) =>
      sum + Number(addition.quantity || 0) * Number(addition.unitPrice || 0),
    0
  );
}

function getItemTotal(item: OrderItem) {
  return (
    Number(item.quantity || 0) * Number(item.unitPrice || 0) +
    getItemAdditionsTotal(item)
  );
}

function orderItemsToCart(order: Order) {
  return (order.items ?? []).reduce<Record<string, number>>((acc, item) => {
    if (item.productId) {
      acc[String(item.productId)] =
        (acc[String(item.productId)] || 0) + Number(item.quantity || 0);
    }
    return acc;
  }, {});
}

function orderItemsToCartAdditions(order: Order) {
  return (order.items ?? []).reduce<Record<string, Record<string, number>>>(
    (acc, item) => {
      if (!item.productId || !Array.isArray(item.additions)) return acc;

      const productId = String(item.productId);

      item.additions.forEach((addition) => {
        if (!addition.productId) return;

        if (!acc[productId]) acc[productId] = {};

        acc[productId][String(addition.productId)] =
          (acc[productId][String(addition.productId)] || 0) +
          Number(addition.quantity || 0);
      });

      return acc;
    },
    {}
  );
}

export function MesaDashboard() {
  const {
    mesas,
    orders,
    deleteMesa,
    deleteOrder,
    payOrder,
    payOrdersBulk,
    addMesa,
    addMesasEmLote,
    updateMesa,
    updateOrderItem,
    deleteOrderItem,
    lojaAtualId,
  } = useAppStore();

  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [addItemsTarget, setAddItemsTarget] = useState<Order | null>(null);
  const [newOrderMesa, setNewOrderMesa] = useState<Mesa | null>(null);
  const [deleteMesaTarget, setDeleteMesaTarget] = useState<Mesa | null>(null);

  const [payTarget, setPayTarget] = useState<Order | null>(null);
  const [cashTarget, setCashTarget] = useState<Order | null>(null);
  const [cashReceived, setCashReceived] = useState('');

  const [openSession, setOpenSession] = useState<any | null>(null);

  const [newPickupOpen, setNewPickupOpen] = useState(false);
  const [createMesaOpen, setCreateMesaOpen] = useState(false);
  const [createManyOpen, setCreateManyOpen] = useState(false);

  const [editRetiradaTarget, setEditRetiradaTarget] = useState<Order | null>(null);
  const [deleteRetiradaTarget, setDeleteRetiradaTarget] = useState<Order | null>(null);

  const [editingItem, setEditingItem] = useState<{
    item: OrderItem;
    order: Order;
  } | null>(null);

  const [deleteItemTarget, setDeleteItemTarget] = useState<{
    order: Order;
    item: OrderItem;
  } | null>(null);

  const [editMesaTarget, setEditMesaTarget] = useState<Mesa | null>(null);

  const [mesaPaymentTarget, setMesaPaymentTarget] = useState<{
    mesa: Mesa;
    orders: Order[];
    total: number;
    comandaNome?: string;
  } | null>(null);

  const retiradaOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (lojaAtualId && String(order.loja_id) !== String(lojaAtualId)) return false;
        if (order.mesaId || order.status === 'paid') return false;
        
        return /\[RETIRADA\]/i.test(order.notes || '');
      })
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [orders, lojaAtualId]);

  const activeOrdersByMesa = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach((order) => {
      if (order.status === 'paid') return;
      if (lojaAtualId && String(order.loja_id) !== String(lojaAtualId)) return;
      if (!order.mesaId) return;

      const mid = String(order.mesaId);
      if (!map.has(mid)) map.set(mid, []);
      map.get(mid)!.push(order);
    });
    return map;
  }, [orders, lojaAtualId]);

  const mesasComResumo = useMemo(() => {
    return mesas
      .filter((mesa) => !lojaAtualId || String(mesa.loja_id) === String(lojaAtualId))
      .map((mesa) => {
        const mesaOrders = activeOrdersByMesa.get(String(mesa.id)) || [];

        let total = 0;
        let totalItens = 0;

        mesaOrders.forEach(order => {
          total += Number(order.total || 0);
          (order.items ?? []).forEach(item => {
            totalItens += Number(item.quantity || 0);
          });
        });

        return {
          mesa,
          orders: mesaOrders,
          total,
          totalItens,
          isOccupied: mesaOrders.length > 0,
        };
      })
      .sort((a, b) => a.mesa.numero - b.mesa.numero);
  }, [mesas, activeOrdersByMesa, lojaAtualId]);

  const filteredMesas = useMemo(() => {
    const q = removerAcentos(searchTerm.trim().toLowerCase());
    if (!q) return mesasComResumo;

    return mesasComResumo.filter(({ mesa, total }) => {
      const numero = String(mesa.numero);
      const nome = removerAcentos(String(mesa.nome || '').toLowerCase());
      const garcom = removerAcentos(String(mesa.garcomNome || '').toLowerCase());
      const totalText = String(total.toFixed(2));

      return (
        numero.includes(q) ||
        nome.includes(q) ||
        garcom.includes(q) ||
        totalText.includes(q)
      );
    });
  }, [mesasComResumo, searchTerm]);

  const filteredRetiradaOrders = useMemo(() => {
    const q = removerAcentos(searchTerm.trim().toLowerCase());
    if (!q) return retiradaOrders;

    return retiradaOrders.filter((order) => {
      const number = String(order.number || '');
      const customer = removerAcentos(String(order.customerName || '').toLowerCase());
      const createdBy = removerAcentos(String(order.createdBy || '').toLowerCase());

      return number.includes(q) || customer.includes(q) || createdBy.includes(q);
    });
  }, [retiradaOrders, searchTerm]);

  const selectedMesaOrders = useMemo(() => {
    if (!selectedMesa) return [];
    
    const mOrders = activeOrdersByMesa.get(String(selectedMesa.id)) || [];
    return [...mOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [selectedMesa, activeOrdersByMesa]);

  const selectedMesaTotal = useMemo(
    () => selectedMesaOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [selectedMesaOrders]
  );

  const normalizeMoneyInput = (value: string) => {
    const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
    return Number(cleaned);
  };

  const cashReceivedValue = normalizeMoneyInput(cashReceived);

  const sessionCashOrders = useMemo(() => {
    if (!openSession) return [];

    return orders.filter((order) => {
      return (
        (!lojaAtualId || String(order.loja_id) === String(lojaAtualId)) &&
        order.status === 'paid' &&
        String(order.paymentMethod || '').toLowerCase() === 'dinheiro' &&
        Number(order.cashSessionId) === Number(openSession.id)
      );
    });
  }, [orders, openSession, lojaAtualId]);

  const availableCashForChange = useMemo(() => {
    const openingAmount = Number(openSession?.opening_amount || 0);

    const totalReceivedCash = sessionCashOrders.reduce(
      (sum, order) => sum + Number(order.amountReceived || 0),
      0
    );

    const totalChangeGiven = sessionCashOrders.reduce(
      (sum, order) => sum + Number(order.changeGiven || 0),
      0
    );

    return openingAmount + totalReceivedCash - totalChangeGiven;
  }, [openSession, sessionCashOrders]);

  const cashChange =
    !!cashTarget && !Number.isNaN(cashReceivedValue)
      ? cashReceivedValue - cashTarget.total
      : 0;

  const hasInsufficientChange =
    !!cashTarget &&
    !!cashReceived &&
    !Number.isNaN(cashReceivedValue) &&
    cashChange > 0 &&
    cashChange > availableCashForChange;

  const canConfirmCashPayment =
    !!cashTarget &&
    !!cashReceived &&
    !Number.isNaN(cashReceivedValue) &&
    cashReceivedValue >= cashTarget.total &&
    !hasInsufficientChange;

  React.useEffect(() => {
    const isPaying = cashTarget || payTarget || mesaPaymentTarget;
    if (!isPaying || !lojaAtualId) return;

    const fetchOpenSession = async () => {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'open')
        .eq('loja_id', lojaAtualId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar caixa aberto:', error);
        setOpenSession(null);
        return;
      }
      setOpenSession(data ?? null);
    };

    fetchOpenSession();
  }, [cashTarget, payTarget, mesaPaymentTarget, lojaAtualId]);

  const handleOpenMesa = (mesa: Mesa) => {
    setSelectedMesa(mesa);
  };

  // NOVA LÓGICA: Pagamento pode ser da mesa toda ou de uma comanda específica
  const handleFinalizePagamento = (ordersToPay: Order[], totalToPay: number, comandaNome?: string) => {
    if (!ordersToPay.length) {
      toast.error('Não há pedidos em aberto para pagar.');
      return;
    }

    setMesaPaymentTarget({
      mesa: selectedMesa!,
      orders: ordersToPay,
      total: totalToPay,
      comandaNome,
    });
  };

  return (
    <>
      <div className="print:hidden mb-4">
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                Gestão de Mesas e Retirada
              </p>
              <p className="text-sm text-muted-foreground">
                Busque por número da mesa, cliente ou garçom
              </p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busque por uma Mesa..."
                className="w-full bg-white text-black placeholder:text-gray-400 border border-border rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCreateMesaOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              Criar mesa
            </button>

            <button
              type="button"
              onClick={() => setCreateManyOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-black text-foreground"
            >
              <LayoutGrid className="w-4 h-4" />
              Criar várias mesas
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.8fr] gap-4 print:hidden">
        <section className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-black uppercase tracking-wider text-sm text-blue-500">
              Mesas
            </h3>
            <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
              {filteredMesas.length}
            </span>
          </div>

          {filteredMesas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
              <p className="text-lg font-bold text-foreground">Nenhuma mesa cadastrada</p>
              <p className="text-sm text-muted-foreground mt-2 mb-5">
                Clique em <strong>Criar mesa</strong> ou <strong>Criar várias mesas</strong> para começar.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreateMesaOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
                >
                  <Plus className="w-4 h-4" />
                  Criar mesa
                </button>

                <button
                  type="button"
                  onClick={() => setCreateManyOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-black text-foreground"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Criar várias
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredMesas.map(({ mesa, total, totalItens, isOccupied, orders: mesaOrders }) => (
                <button
                  key={mesa.id}
                  type="button"
                  onClick={() => handleOpenMesa(mesa)}
                  className={`text-left rounded-2xl border p-4 min-h-[165px] transition-all hover:-translate-y-1 hover:shadow-lg overflow-hidden ${
                    isOccupied
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        Mesa
                      </p>
                      <p className="text-2xl font-black text-foreground">{mesa.numero}</p>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                        isOccupied
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          : 'bg-green-500/15 text-green-400 border border-green-500/30'
                      }`}
                    >
                      {isOccupied ? 'Ocupada' : 'Livre'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <p className="text-xs text-muted-foreground truncate">
                      Garçom:{' '}
                      <span className="font-bold text-foreground">
                        {mesa.garcomNome || '-'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pedidos:{' '}
                      <span className="font-bold text-foreground">
                        {mesaOrders.length}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Itens:{' '}
                      <span className="font-bold text-foreground">
                        {totalItens}
                      </span>
                    </p>
                    <p className="text-base font-black text-foreground pt-2">
                      {formatMoney(total)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-black uppercase tracking-wider text-sm text-amber-400">
              Retirada
            </h3>
            <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
              {filteredRetiradaOrders.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setNewPickupOpen(true)}
            className="mb-4 w-full rounded-xl bg-primary text-primary-foreground py-3 font-black text-sm"
          >
            + Novo pedido retirada
          </button>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredRetiradaOrders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2 italic">
                Sem pedidos de retirada
              </p>
            )}

            {filteredRetiradaOrders.map((order: Order) => (
              <RetiradaCard
                key={order.id}
                order={order}
                onEdit={() => setEditRetiradaTarget(order)}
                onDelete={() => setDeleteRetiradaTarget(order)}
                onFinalize={() => setPayTarget(order)}
              />
            ))}
          </div>
        </section>
      </div>

      <CreateMesaModal
        open={createMesaOpen}
        onClose={() => setCreateMesaOpen(false)}
        onSubmit={async (data) => {
          if (!lojaAtualId) {
            toast.error('Erro de contexto: Loja não identificada.');
            return;
          }
          const ok = await addMesa({ ...data, loja_id: lojaAtualId });
          if (ok) setCreateMesaOpen(false);
        }}
      />

      <CreateManyMesasModal
        open={createManyOpen}
        onClose={() => setCreateManyOpen(false)}
        onSubmit={async (data) => {
          if (!lojaAtualId) {
            toast.error('Erro de contexto: Loja não identificada.');
            return;
          }
          const ok = await addMesasEmLote({ ...data, loja_id: lojaAtualId });
          if (ok) setCreateManyOpen(false);
        }}
      />

      <EditMesaModal
        open={!!editMesaTarget}
        mesa={editMesaTarget}
        onClose={() => setEditMesaTarget(null)}
        onSubmit={async (mesa) => {
          await updateMesa(mesa);
          setEditMesaTarget(null);
        }}
      />

      {selectedMesa && (
        <MesaDetailsModal
          mesa={selectedMesa}
          orders={selectedMesaOrders}
          total={selectedMesaTotal}
          onClose={() => setSelectedMesa(null)}
          onAddItemToMesa={() => {
            const targetOrder = selectedMesaOrders[selectedMesaOrders.length - 1];

            if (!targetOrder) {
              toast.error('Essa mesa ainda não possui pedido aberto.');
              return;
            }

            setSelectedMesa(null);
            setAddItemsTarget(targetOrder);
          }}
          onOpenOrder={() => {
            setSelectedMesa(null);
            setNewOrderMesa(selectedMesa);
          }}
          onEditMesa={() => {
            setEditMesaTarget(selectedMesa);
          }}
          onDeleteMesa={() => {
            setDeleteMesaTarget(selectedMesa);
            setSelectedMesa(null);
          }}
          onFinalize={(ordersToPay, totalToPay, nome) => handleFinalizePagamento(ordersToPay, totalToPay, nome)}
          onEditItem={(order: Order, item: OrderItem) => {
            setEditingItem({ order, item });
          }}
          onDeleteItem={(order: Order, item: OrderItem) => {
            if (!item.id) {
              toast.error('Item sem identificador.');
              return;
            }

            setDeleteItemTarget({ order, item });
          }}
        />
      )}

      {newOrderMesa && (
        <NewOrderModal
          open={!!newOrderMesa}
          onClose={() => setNewOrderMesa(null)}
          initialCustomerName={`Mesa ${newOrderMesa.numero}`}
          mesaId={newOrderMesa.id}
          mesaNumero={newOrderMesa.numero}
        />
      )}

      {newPickupOpen && (
        <NewOrderModal
          open={newPickupOpen}
          onClose={() => setNewPickupOpen(false)}
          initialCustomerName=""
          forceOrderType="Retirada"
          hideOrderTypeSelector
        />
      )}

      {addItemsTarget && (
        <NewOrderModal
          open={!!addItemsTarget}
          onClose={() => setAddItemsTarget(null)}
          appendOrderId={addItemsTarget.id}
          initialCustomerName={addItemsTarget.customerName}
          appendBaseNotes={addItemsTarget.notes}
        />
      )}

      {editRetiradaTarget && (
        <NewOrderModal
          open={!!editRetiradaTarget}
          onClose={() => setEditRetiradaTarget(null)}
          editOrderId={editRetiradaTarget.id}
          initialCustomerName={editRetiradaTarget.customerName}
          initialCart={orderItemsToCart(editRetiradaTarget)}
          initialCartAdditions={orderItemsToCartAdditions(editRetiradaTarget)}
          initialNotes={editRetiradaTarget.notes}
          forceOrderType="Retirada"
          hideOrderTypeSelector
        />
      )}

      {deleteRetiradaTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-[#111] p-6 text-white shadow-2xl">
            <h3 className="text-xl font-black mb-2">Excluir pedido de retirada?</h3>

            <p className="text-sm text-gray-400 mb-6">
              Tem certeza que deseja excluir o pedido{' '}
              <span className="font-bold text-white">
                #{String(deleteRetiradaTarget.number || 0).padStart(4, '0')}
              </span>{' '}
              de{' '}
              <span className="font-bold text-white">
                {deleteRetiradaTarget.customerName || 'Retirada'}
              </span>
              ?
            </p>

            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 mb-6">
              <p className="text-sm text-red-300 font-medium">
                Essa ação remove o pedido em aberto e seus itens.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteRetiradaTarget(null)}
                className="flex-1 rounded-2xl bg-gray-800 py-3 font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteOrder(deleteRetiradaTarget.id);
                    toast.success('Pedido de retirada excluído.');
                    setDeleteRetiradaTarget(null);
                  } catch (error) {
                    console.error(error);
                    toast.error('Erro ao excluir pedido de retirada.');
                  }
                }}
                className="flex-1 rounded-2xl bg-red-600 py-3 font-black text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteItemTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-[#111] p-6 text-white shadow-2xl">
            <h3 className="text-xl font-black mb-2">Excluir item?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Tem certeza que deseja excluir{' '}
              <span className="font-bold text-white">
                {deleteItemTarget.item.productName}
              </span>
              ?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteItemTarget(null)}
                className="flex-1 rounded-2xl bg-gray-800 py-3 font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!deleteItemTarget.item.id) {
                    toast.error('Item sem identificador.');
                    return;
                  }

                  await deleteOrderItem(deleteItemTarget.item.id);
                  setDeleteItemTarget(null);
                }}
                className="flex-1 rounded-2xl bg-red-600 py-3 font-black text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <EditOrderItemModal
        open={!!editingItem}
        item={editingItem?.item ?? null}
        onClose={() => setEditingItem(null)}
        onConfirm={async (quantity) => {
          if (!editingItem?.item?.id) {
            toast.error('Item sem identificador.');
            return;
          }

          await updateOrderItem(editingItem.item.id, quantity);
          setEditingItem(null);
        }}
      />

      {deleteMesaTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] print:hidden">
          <div className="p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-gray-800 bg-[#111] text-white">
            <h3 className="text-xl font-bold text-center mb-6">
              Excluir Mesa {deleteMesaTarget.numero}?
            </h3>

            <div className="flex gap-3 justify-center">
              <button
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all"
                onClick={() => setDeleteMesaTarget(null)}
              >
                Cancelar
              </button>

              <button
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
                onClick={async () => {
                  const hasOpenOrders = orders.some(
                    (o) =>
                      String(o.mesaId) === String(deleteMesaTarget.id) &&
                      o.status !== 'paid' &&
                      (!lojaAtualId || String(o.loja_id) === String(lojaAtualId))
                  );

                  if (hasOpenOrders) {
                    toast.error('Não é possível excluir uma mesa com pedidos em aberto.');
                    setDeleteMesaTarget(null);
                    return;
                  }

                  await deleteMesa(deleteMesaTarget.id);
                  setDeleteMesaTarget(null);
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {mesaPaymentTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] print:hidden">
          <div
            style={{ backgroundColor: '#111', color: '#fff' }}
            className="p-8 rounded-3xl shadow-[0_0_50px_rgba(var(--primary),0.15)] max-w-md w-full mx-4 border border-gray-800 animate-slide-up"
          >
            <div className="flex flex-col items-center mb-6 border-b border-gray-800 pb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-black text-center mb-1">
                Finalizar {mesaPaymentTarget.comandaNome ? `Comanda: ${mesaPaymentTarget.comandaNome}` : `Mesa ${mesaPaymentTarget.mesa.numero}`}
              </h3>
              <p className="text-muted-foreground text-sm">
                {mesaPaymentTarget.orders.length} pedido(s) selecionado(s)
              </p>
              <p className="text-3xl font-black text-white mt-4 tracking-tight">
                {formatMoney(mesaPaymentTarget.total)}
              </p>
            </div>

            <div className="space-y-3 mb-6 max-h-[30vh] overflow-y-auto pr-2">
              {mesaPaymentTarget.orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        #{String(order.number).padStart(4, '0')}
                      </p>
                      <p className="text-xs text-gray-400">{order.customerName}</p>
                    </div>
                    <p className="text-sm font-black">{formatMoney(order.total)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => {
                  if (!mesaPaymentTarget || mesaPaymentTarget.orders.length === 0) return;

                  const firstOrder = mesaPaymentTarget.orders[0];

                  setCashTarget({
                    ...firstOrder,
                    total: mesaPaymentTarget.total,
                  });
                  setCashReceived('');
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-500 rounded-2xl font-black transition-all"
              >
                Dinheiro
              </button>

              <button
                onClick={async () => {
                  await payOrdersBulk(
                    mesaPaymentTarget.orders.map((o) => o.id),
                    'pix'
                  );
                  setMesaPaymentTarget(null);
                  if (!mesaPaymentTarget.comandaNome) setSelectedMesa(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-500 rounded-2xl font-black transition-all"
              >
                PIX
              </button>

              <button
                onClick={async () => {
                  await payOrdersBulk(
                    mesaPaymentTarget.orders.map((o) => o.id),
                    'credito'
                  );
                  setMesaPaymentTarget(null);
                  if (!mesaPaymentTarget.comandaNome) setSelectedMesa(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500 rounded-2xl font-black transition-all"
              >
                Crédito
              </button>

              <button
                onClick={async () => {
                  await payOrdersBulk(
                    mesaPaymentTarget.orders.map((o) => o.id),
                    'debito'
                  );
                  setMesaPaymentTarget(null);
                  if (!mesaPaymentTarget.comandaNome) setSelectedMesa(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-500 rounded-2xl font-black transition-all"
              >
                Débito
              </button>
            </div>

            <button
              className="w-full py-4 text-gray-500 hover:bg-gray-800 hover:text-white rounded-xl font-bold transition-all"
              onClick={() => setMesaPaymentTarget(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {payTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] print:hidden">
          <div
            style={{ backgroundColor: '#111', color: '#fff' }}
            className="p-8 rounded-3xl shadow-[0_0_50px_rgba(var(--primary),0.15)] max-w-sm w-full mx-4 border border-gray-800 animate-slide-up"
          >
            <div className="flex flex-col items-center mb-6 border-b border-gray-800 pb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-black text-center mb-1">Cobrar Pedido</h3>
              <p className="text-muted-foreground text-sm">Selecione a forma de pagamento</p>
              <p className="text-3xl font-black text-white mt-4 tracking-tight">
                R$ {payTarget.total.toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => {
                  setCashTarget(payTarget);
                  setCashReceived('');
                  setPayTarget(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-500 rounded-2xl font-black transition-all group"
              >
                Dinheiro
              </button>

              <button
                onClick={async () => {
                  await payOrder(payTarget.id, 'pix');
                  setPayTarget(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-500 rounded-2xl font-black transition-all"
              >
                PIX
              </button>

              <button
                onClick={async () => {
                  await payOrder(payTarget.id, 'credito');
                  setPayTarget(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500 rounded-2xl font-black transition-all"
              >
                Crédito
              </button>

              <button
                onClick={async () => {
                  await payOrder(payTarget.id, 'debito');
                  setPayTarget(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-500 rounded-2xl font-black transition-all"
              >
                Débito
              </button>
            </div>

            <button
              className="w-full py-4 text-gray-500 hover:bg-gray-800 hover:text-white rounded-xl font-bold transition-all"
              onClick={() => setPayTarget(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {cashTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] print:hidden p-4">
          <div
            style={{ backgroundColor: '#111', color: '#fff' }}
            className="w-full max-w-md rounded-3xl shadow-[0_0_50px_rgba(34,197,94,0.12)] border border-gray-800 overflow-hidden animate-slide-up"
          >
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Pagamento em Dinheiro</h3>
                  <p className="text-sm text-muted-foreground">
                    Pedido #{cashTarget.number ? cashTarget.number.toString().padStart(4, '0') : '0000'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <p className="text-sm text-muted-foreground mb-1">Cliente / Mesa</p>
                <p className="font-bold text-white">{cashTarget.customerName}</p>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total a pagar</p>
                    <p className="text-3xl font-black text-white">
                      R$ {cashTarget.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                  Valor recebido
                </label>
                <input
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="Ex: 50,00"
                  inputMode="decimal"
                  className="w-full bg-white text-black placeholder:text-gray-400 border border-border/60 rounded-2xl px-5 py-4 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all font-medium text-[18px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCashReceived(String(cashTarget.total.toFixed(2)).replace('.', ','))}
                  className="py-3 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 font-bold transition-all"
                >
                  Valor exato
                </button>

                <button
                  type="button"
                  onClick={() => setCashReceived('')}
                  className="py-3 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 font-bold transition-all"
                >
                  Limpar
                </button>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-white">
                    R$ {cashTarget.total.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Recebido</span>
                  <span className="font-bold text-white">
                    R$ {!Number.isNaN(cashReceivedValue) && cashReceived ? cashReceivedValue.toFixed(2) : '0.00'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Disponível para troco</span>
                  <span className="font-bold text-white">
                    R$ {availableCashForChange.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground">Troco necessário</span>
                  <span className={`text-2xl font-black ${cashChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    R$ {cashChange.toFixed(2)}
                  </span>
                </div>

                {cashReceived && cashChange < 0 && (
                  <p className="text-xs text-red-400 font-medium">
                    O valor recebido é menor que o total da conta.
                  </p>
                )}

                {cashReceived && cashChange > 0 && hasInsufficientChange && (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                      <p className="text-xs text-red-300 font-medium leading-relaxed">
                        Troco insuficiente no caixa. Disponível: R$ {availableCashForChange.toFixed(2)}. Necessário: R$ {cashChange.toFixed(2)}.
                      </p>
                    </div>
                  </div>
                )}

                {!!openSession && (
                  <p className="text-[11px] text-gray-400">
                    Fundo inicial considerado: R$ {Number(openSession.opening_amount || 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setCashTarget(null);
                  setCashReceived('');
                }}
                className="flex-1 py-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-2xl font-bold transition-all"
              >
                Cancelar
              </button>

              <button
                disabled={!canConfirmCashPayment}
                onClick={async () => {
                  try {
                    if (mesaPaymentTarget) {
                      await payOrdersBulk(
                        mesaPaymentTarget.orders.map((o) => o.id),
                        'dinheiro',
                        {
                          amountReceived: cashReceivedValue,
                          changeGiven: cashChange,
                        }
                      );

                      setMesaPaymentTarget(null);
                      if (!mesaPaymentTarget.comandaNome) setSelectedMesa(null);
                    } else if (cashTarget) {
                      await payOrder(cashTarget.id, 'dinheiro', {
                        amountReceived: cashReceivedValue,
                        changeGiven: cashChange,
                      });
                    }

                    setCashTarget(null);
                    setCashReceived('');
                  } catch (error) {
                    console.error(error);
                  }
                }}
                className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black transition-all disabled:opacity-50 disabled:hover:bg-green-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CreateMesaModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { numero: number; nome?: string; garcomNome?: string; loja_id?: string }) => void;
}) {
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [garcomNome, setGarcomNome] = useState('');

  React.useEffect(() => {
    if (!open) {
      setNumero('');
      setNome('');
      setGarcomNome('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-[#111] text-white p-6">
        <h3 className="text-2xl font-black mb-6">Criar mesa</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Número da mesa
            </label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
              placeholder="Ex: 1"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Nome da mesa (opcional)
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
              placeholder="Mesa"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Garçom padrão (opcional)
            </label>
            <input
              value={garcomNome}
              onChange={(e) => setGarcomNome(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
              placeholder="Ex: João"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-gray-800 py-3 font-bold"
          >
            Cancelar
          </button>

          <button
            onClick={() =>
              onSubmit({
                numero: Number(numero),
                nome,
                garcomNome,
              })
            }
            className="flex-1 rounded-2xl bg-primary py-3 font-black text-primary-foreground"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateManyMesasModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    inicial: number;
    final: number;
    prefixoNome?: string;
    garcomNome?: string;
    loja_id?: string;
  }) => void;
}) {
  const [inicial, setInicial] = useState('');
  const [final, setFinal] = useState('');
  const [prefixoNome, setPrefixoNome] = useState('Mesa');
  const [garcomNome, setGarcomNome] = useState('');

  React.useEffect(() => {
    if (!open) {
      setInicial('');
      setFinal('');
      setPrefixoNome('Mesa');
      setGarcomNome('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-[#111] text-white p-6">
        <h3 className="text-2xl font-black mb-6">Criar várias mesas</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Inicial
              </label>
              <input
                value={inicial}
                onChange={(e) => setInicial(e.target.value)}
                className="w-full rounded-2xl bg-white text-black px-4 py-3"
                placeholder="1"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Final
              </label>
              <input
                value={final}
                onChange={(e) => setFinal(e.target.value)}
                className="w-full rounded-2xl bg-white text-black px-4 py-3"
                placeholder="20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Prefixo do nome
            </label>
            <input
              value={prefixoNome}
              onChange={(e) => setPrefixoNome(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
              placeholder="Mesa"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Garçom padrão (opcional)
            </label>
            <input
              value={garcomNome}
              onChange={(e) => setGarcomNome(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
              placeholder="Ex: João"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-gray-800 py-3 font-bold"
          >
            Cancelar
          </button>

          <button
            onClick={() =>
              onSubmit({
                inicial: Number(inicial),
                final: Number(final),
                prefixoNome,
                garcomNome,
              })
            }
            className="flex-1 rounded-2xl bg-primary py-3 font-black text-primary-foreground"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditMesaModal({
  open,
  mesa,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mesa: Mesa | null;
  onClose: () => void;
  onSubmit: (mesa: Mesa) => Promise<void>;
}) {
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [garcomNome, setGarcomNome] = useState('');

  React.useEffect(() => {
    if (open && mesa) {
      setNumero(String(mesa.numero));
      setNome(mesa.nome || '');
      setGarcomNome(mesa.garcomNome || '');
    } else {
      setNumero('');
      setNome('');
      setGarcomNome('');
    }
  }, [open, mesa]);

  if (!open || !mesa) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1200] p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-[#111] text-white p-6">
        <h3 className="text-2xl font-black mb-6">Editar mesa</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Número da mesa
            </label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Nome da mesa
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Garçom responsável
            </label>
            <input
              value={garcomNome}
              onChange={(e) => setGarcomNome(e.target.value)}
              className="w-full rounded-2xl bg-white text-black px-4 py-3"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-gray-800 py-3 font-bold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={async () => {
              await onSubmit({
                ...mesa,
                numero: Number(numero),
                nome: nome.trim() || `Mesa ${numero}`,
                garcomNome: garcomNome.trim() || null,
              });
            }}
            className="flex-1 rounded-2xl bg-primary py-3 font-black text-primary-foreground"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function RetiradaCard({
  order,
  onEdit,
  onDelete,
  onFinalize,
}: {
  order: Order;
  onEdit: () => void;
  onDelete: () => void;
  onFinalize: () => void;
}) {
  const { user } = useAuth();
  const podePagar = user?.perfil === 'admin_loja' || user?.isDeveloper;

  const batches: OrderBatch[] =
    Array.isArray(order.itemBatches) && order.itemBatches.length > 0
      ? order.itemBatches
      : [
          {
            id: `legacy-${order.id}`,
            items: order.items ?? [],
            notes: order.notes ?? '',
            createdAt: order.createdAt,
            isAdditional: false,
          },
        ];

  return (
    <div className="bg-background border border-border rounded-xl p-3 shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div>
          <p className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground inline-block">
            #{String(order.number || 0).padStart(4, '0')}
          </p>

          <p className="font-bold mt-2">{order.customerName || 'Retirada'}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-black text-amber-400">
              RETIRADA
            </span>

            {order.createdBy && (
              <span className="rounded-md border border-gray-700 bg-black/30 px-2 py-1 text-[11px] font-bold text-gray-300">
                por {order.createdBy}
              </span>
            )}

            <span className="rounded-md border border-gray-700 bg-black/30 px-2 py-1 text-[11px] font-bold text-gray-300">
              {format(new Date(order.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-3">
        {batches.map((batch, index) => (
          <div key={batch.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                {batch.isAdditional ? `Adição ${index}` : 'Pedido principal'}
              </p>
            </div>

            <div className="space-y-2">
              {batch.items.map((item, idx) => {
                const additionsTotal = getItemAdditionsTotal(item);

                return (
                  <div key={`${batch.id}-${idx}`} className="space-y-1">
                    <div className="flex justify-between text-sm gap-3">
                      <span>
                        <span className="font-black text-primary mr-1">
                          {item.quantity}x
                        </span>
                        {item.productName}
                      </span>

                      <span>{formatMoney(item.quantity * item.unitPrice + additionsTotal)}</span>
                    </div>

                    {(item.additions ?? []).length > 0 && (
                      <div className="ml-5 space-y-0.5">
                        {(item.additions ?? []).map((addition) => (
                          <div
                            key={`${item.productId}-${addition.productId}`}
                            className="text-[11px] font-bold text-muted-foreground"
                          >
                            + {addition.quantity}x {addition.productName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-border">
        <span className="font-bold">{formatMoney(order.total)}</span>

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 text-xs font-bold px-3 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-400 rounded-md"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-2 text-xs font-bold px-3 py-2 border border-red-500/30 bg-red-500/10 text-red-400 rounded-md"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>

          {podePagar && (
            <button
              type="button"
              onClick={onFinalize}
              className="flex items-center gap-2 text-xs font-black px-3 py-2 bg-green-600 text-white rounded-md"
            >
              <CreditCard className="w-4 h-4" />
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MesaDetailsModal({
  mesa,
  orders,
  total,
  onClose,
  onAddItemToMesa,
  onOpenOrder,
  onEditMesa,
  onDeleteMesa,
  onFinalize,
  onEditItem,
  onDeleteItem,
}: {
  mesa: Mesa;
  orders: Order[];
  total: number;
  onClose: () => void;
  onAddItemToMesa: () => void;
  onOpenOrder: () => void;
  onEditMesa: () => void;
  onDeleteMesa: () => void;
  onFinalize: (orders: Order[], total: number, comandaNome?: string) => void;
  onEditItem: (order: Order, item: OrderItem) => void;
  onDeleteItem: (order: Order, item: OrderItem) => void;
}) {
  const { user } = useAuth();
  const podePagar = user?.perfil === 'admin_loja' || user?.isDeveloper;

  const [printModalOpen, setPrintModalOpen] = useState(false);

  const isOccupied = orders.length > 0;

  const totalItensMesa = orders.reduce((sum, order) => {
    return (
      sum +
      (order.items ?? []).reduce((acc, item) => acc + Number(item.quantity || 0), 0)
    );
  }, 0);

  // AGRUPA AS COMANDAS PELO NOME DO CLIENTE
  const comandas = useMemo(() => {
    const groups = new Map<string, Order[]>();
    
    orders.forEach((o) => {
      // Se não tiver nome, agrupa no nome da mesa
      const nomeComanda = o.customerName || `Mesa ${mesa.numero}`;
      if (!groups.has(nomeComanda)) groups.set(nomeComanda, []);
      groups.get(nomeComanda)!.push(o);
    });

    return Array.from(groups.entries()).map(([nome, ped]) => ({
      nome,
      orders: ped,
      total: ped.reduce((sum, p) => sum + Number(p.total || 0), 0),
    }));
  }, [orders, mesa.numero]);

  const handlePrintConta = (alvo: string) => {
    // Isso pode ser integrado com a sua impressora (Bluetooth, USB, ou API)
    toast.success(`Conta de ${alvo} enviada para impressão!`);
    setPrintModalOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-2 sm:p-4 print:hidden">
        <div className="flex w-full max-w-4xl max-h-[94dvh] sm:max-h-[92vh] flex-col overflow-hidden rounded-3xl border border-gray-800 bg-[#111] text-white shadow-2xl">
          <div className="shrink-0 flex items-center justify-between border-b border-gray-800 p-3 sm:p-6">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                Detalhes da Mesa
              </p>

              <h3 className="mt-0.5 sm:mt-1 text-2xl sm:text-3xl font-black">
                Mesa {mesa.numero}
              </h3>

              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-400">
                Garçom:{' '}
                <span className="font-bold text-white">
                  {mesa.garcomNome || 'Não definido'}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 transition-colors hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="shrink-0 border-b border-gray-800 p-3 sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
              <InfoCard
                label="Status"
                value={isOccupied ? 'Ocupada' : 'Livre'}
                highlight={isOccupied ? 'warning' : 'success'}
              />
              <InfoCard label="Comandas" value={String(comandas.length)} />
              <InfoCard label="Itens" value={String(totalItensMesa)} />
              <InfoCard label="Total Geral" value={formatMoney(total)} highlight="primary" />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
            {!isOccupied ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-8 text-center">
                <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-gray-500" />
                <p className="text-lg font-bold">Mesa livre</p>
                <p className="mt-1 mb-5 text-sm text-gray-400">
                  Ainda não há consumo lançado nesta mesa.
                </p>

                <button
                  type="button"
                  onClick={onOpenOrder}
                  className="rounded-xl bg-primary px-5 py-3 font-black text-primary-foreground"
                >
                  Abrir pedido na mesa
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {comandas.map((comanda) => (
                  <div key={comanda.nome} className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
                    <div className="bg-gray-800/40 p-4 flex flex-wrap gap-3 justify-between items-center border-b border-gray-800">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Comanda</p>
                        <p className="text-lg sm:text-xl font-black text-white">{comanda.nome}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Comanda</p>
                        <p className="text-lg sm:text-xl font-black text-primary">{formatMoney(comanda.total)}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {comanda.orders.map((order: Order) => (
                        <div key={order.id} className="space-y-3">
                          {(order.itemBatches ?? []).map((batch: OrderBatch, index: number) => {
                            const batchLabel = batch.isAdditional
                              ? `Adição ${index}`
                              : `Pedido principal #${String(order.number).padStart(4, '0')}`;

                            const obs = processarNota(batch.notes || '').textoObs;

                            return (
                              <div key={batch.id} className="rounded-xl border border-gray-800 bg-black/40 p-3">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-primary">
                                      {batchLabel}
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                      {format(new Date(batch.createdAt), 'HH:mm', { locale: ptBR })}
                                      {order.createdBy ? ` • por ${order.createdBy}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {batch.items.map((item: OrderItem, idx: number) => {
                                    const itemAdditions = item.additions ?? [];
                                    const itemTotal = getItemTotal(item);

                                    return (
                                      <div
                                        key={`${batch.id}-${idx}-${item.id ?? item.productId}`}
                                        className="rounded-xl bg-[#151515] p-3 text-sm"
                                      >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-start gap-2">
                                              <span className="shrink-0 font-black text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">
                                                {item.quantity}x
                                              </span>

                                              <div className="min-w-0">
                                                <p className="break-words font-bold leading-snug text-white">
                                                  {item.productName}
                                                </p>

                                                {itemAdditions.length > 0 && (
                                                  <div className="mt-1 space-y-0.5 pl-1 border-l-2 border-gray-700">
                                                    {itemAdditions.map((addition) => (
                                                      <p
                                                        key={`${item.id ?? item.productId}-${addition.productId}`}
                                                        className="text-[11px] font-bold text-gray-400"
                                                      >
                                                        + {addition.quantity}x {addition.productName}
                                                      </p>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                                            <span className="shrink-0 text-sm font-black text-white">
                                              {formatMoney(itemTotal)}
                                            </span>

                                            <div className="flex shrink-0 gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => onEditItem(order, item)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 transition-all hover:bg-blue-500/20 active:scale-95"
                                                title="Editar item"
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => onDeleteItem(order, item)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
                                                title="Excluir item"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {obs && (
                                  <div className="mt-2 rounded-lg border-l-2 border-amber-500/50 bg-amber-500/10 p-2 text-xs font-medium italic text-amber-200/80">
                                    {obs}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 border-t border-gray-800 flex gap-2 justify-end bg-black/20">
                      <button
                        type="button"
                        onClick={() => handlePrintConta(comanda.nome)}
                        className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700 flex items-center gap-2 transition-all active:scale-95"
                      >
                        <Receipt className="w-4 h-4" />
                        Imprimir Parcial
                      </button>

                      {podePagar && (
                        <button
                          type="button"
                          onClick={() => onFinalize(comanda.orders, comanda.total, comanda.nome)}
                          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white flex items-center gap-2 hover:bg-green-500 transition-all active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                        >
                          <CreditCard className="w-4 h-4" />
                          Cobrar {comanda.nome}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-800 p-3 sm:p-6 bg-[#0a0a0a]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Total Geral da mesa</p>
                <p className="text-2xl sm:text-3xl font-black">{formatMoney(total)}</p>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                {!isOccupied && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenOrder}
                      className="rounded-xl bg-primary px-4 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-black text-primary-foreground"
                    >
                      Abrir pedido
                    </button>

                    {podePagar && (
                      <>
                        <button
                          type="button"
                          onClick={onEditMesa}
                          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-bold text-blue-400"
                        >
                          Editar mesa
                        </button>

                        <button
                          type="button"
                          onClick={onDeleteMesa}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-bold text-red-400"
                        >
                          Excluir mesa
                        </button>
                      </>
                    )}
                  </>
                )}

                {isOccupied && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPrintModalOpen(true)}
                      className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-bold text-white transition-colors hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      Imprimir Conta
                    </button>

                    <button
                      type="button"
                      onClick={onAddItemToMesa}
                      className="rounded-xl bg-primary px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-black text-primary-foreground transition-all active:scale-95"
                    >
                      + Lançar Item
                    </button>

                    {podePagar && (
                      <button
                        type="button"
                        onClick={() => onFinalize(orders, total)}
                        className="rounded-xl bg-green-600 px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-black text-white flex items-center gap-2 transition-all hover:bg-green-500 active:scale-95 shadow-lg shadow-green-600/20"
                      >
                        <CreditCard className="w-5 h-5" />
                        Pagar Mesa Completa
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {printModalOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/90 p-4 print:hidden animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-[#111] p-6 text-white shadow-2xl animate-slide-up">
            <h3 className="text-xl font-black mb-1 flex items-center gap-2">
              <Printer className="w-5 h-5 text-gray-400" /> Opções de Impressão
            </h3>
            <p className="text-sm text-gray-400 mb-6">Mesa {mesa.numero}</p>

            <div className="space-y-3">
              <button
                onClick={() => handlePrintConta(`Mesa Completa`)}
                className="w-full flex justify-between items-center bg-primary/10 border border-primary/30 p-4 rounded-2xl hover:bg-primary/20 transition-all active:scale-95"
              >
                <div className="text-left">
                  <span className="block font-bold text-primary">Imprimir Mesa Completa</span>
                  <span className="text-xs text-primary/70">{comandas.length} comandas juntas</span>
                </div>
                <span className="font-black text-primary">{formatMoney(total)}</span>
              </button>

              <div className="my-4 border-t border-gray-800" />

              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Comandas Individuais</p>
              
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {comandas.map(c => (
                  <button
                    key={c.nome}
                    onClick={() => handlePrintConta(c.nome)}
                    className="w-full flex justify-between items-center bg-gray-900 border border-gray-800 p-3 rounded-xl hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <span className="font-bold text-white truncate max-w-[140px] text-left">{c.nome}</span>
                    <span className="font-black text-gray-300">{formatMoney(c.total)}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPrintModalOpen(false)}
              className="mt-6 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'primary' | 'success' | 'warning';
}) {
  const highlightClass =
    highlight === 'primary'
      ? 'text-primary'
      : highlight === 'success'
        ? 'text-green-400'
        : highlight === 'warning'
          ? 'text-orange-400'
          : 'text-white';

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className={`mt-1 sm:mt-2 text-lg sm:text-xl font-black ${highlightClass}`}>
        {value}
      </p>
    </div>
  );
}

function EditOrderItemModal({
  open,
  item,
  onClose,
  onConfirm,
}: {
  open: boolean;
  item: OrderItem | null;
  onClose: () => void;
  onConfirm: (quantity: number) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState('');

  React.useEffect(() => {
    if (open && item) {
      setQuantity(String(item.quantity));
    } else {
      setQuantity('');
    }
  }, [open, item]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-[#111] p-6 text-white">
        <h3 className="text-xl font-black mb-2">Editar item</h3>
        <p className="text-sm text-gray-400 mb-4">{item.productName}</p>

        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          Quantidade
        </label>

        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          type="number"
          min="1"
          className="w-full rounded-2xl bg-white px-4 py-3 text-black"
        />

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-gray-800 py-3 font-bold"
          >
            Cancelar
          </button>

          <button
            onClick={async () => {
              await onConfirm(Number(quantity));
              onClose();
            }}
            className="flex-1 rounded-2xl bg-primary py-3 font-black text-primary-foreground"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMoney(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(val || 0));
}