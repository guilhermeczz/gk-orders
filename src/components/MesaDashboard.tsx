import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Printer,
  PlusCircle,
  Search,
  Banknote,
  AlertTriangle,
  UtensilsCrossed,
  X,
  Plus,
  LayoutGrid,
  Pencil,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Mesa, Order, OrderBatch, OrderItem } from '@/lib/types';
import { NewOrderModal } from './NewOrderModal';

type PrintJob = {
  order: Order;
  batch?: OrderBatch | null;
  onlyBatch: boolean;
};

const removerAcentos = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const processarNota = (notes: string) => {
  if (!notes) return { tipo: '', textoObs: '' };
  const regex = /\[(LOCAL|RETIRADA)\]/i;
  const match = notes.match(regex);
  const tipo = match ? match[1].toUpperCase() : '';
  const textoObs = notes.replace(regex, '').trim();
  return { tipo, textoObs };
};

export function MesaDashboard() {
  const {
    mesas,
    orders,
    deleteMesa,
    payOrder,
    payOrdersBulk,
    addMesa,
    addMesasEmLote,
    updateMesa,
    updateOrderItem,
    deleteOrderItem,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [addItemsTarget, setAddItemsTarget] = useState<Order | null>(null);
  const [newOrderMesa, setNewOrderMesa] = useState<Mesa | null>(null);
  const [deleteMesaTarget, setDeleteMesaTarget] = useState<Mesa | null>(null);
  const [payTarget, setPayTarget] = useState<Order | null>(null);
  const [cashTarget, setCashTarget] = useState<Order | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [openSession, setOpenSession] = useState<any | null>(null);
  const [newPickupOpen, setNewPickupOpen] = useState(false);
  const [createMesaOpen, setCreateMesaOpen] = useState(false);
  const [createManyOpen, setCreateManyOpen] = useState(false);
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
  } | null>(null);

  const paidOrders = useMemo(
    () => orders.filter((order) => order.status === 'paid'),
    [orders]
  );

  const retiradaOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const tipo = processarNota(order.notes || '').tipo;
        return !order.mesaId && order.status !== 'paid' && tipo === 'RETIRADA';
      })
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [orders]);

const mesasComResumo = useMemo(() => {
  return mesas
    .map((mesa) => {
      const mesaOrders = orders.filter(
        (order) =>
          String(order.mesaId) === String(mesa.id) &&
          order.status !== 'paid'
      );

      const total = mesaOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      const totalItens = mesaOrders.reduce(
        (sum, order) =>
          sum +
          (order.items ?? []).reduce(
            (acc, item) => acc + Number(item.quantity || 0),
            0
          ),
        0
      );

      const isOccupied = mesaOrders.length > 0;

      return {
        mesa,
        orders: mesaOrders,
        total,
        totalItens,
        isOccupied,
      };
    })
    .sort((a, b) => a.mesa.numero - b.mesa.numero);
}, [mesas, orders]);

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

  return orders
    .filter(
      (order) =>
        String(order.mesaId) === String(selectedMesa.id) &&
        order.status !== 'paid'
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}, [orders, selectedMesa]);

  const selectedMesaTotal = useMemo(
    () => selectedMesaOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [selectedMesaOrders]
  );

  const itemsToPrint = printJob?.onlyBatch
    ? printJob.batch?.items ?? []
    : printJob?.order.items ?? [];
  const notesToPrint = printJob?.onlyBatch
    ? printJob?.batch?.notes ?? ''
    : printJob?.order.notes ?? '';
  const totalToPrint = itemsToPrint.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const printDate = printJob?.onlyBatch
    ? printJob?.batch?.createdAt
    : printJob?.order.createdAt;

  const normalizeMoneyInput = (value: string) => {
    const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
    return Number(cleaned);
  };

  const cashReceivedValue = normalizeMoneyInput(cashReceived);

  const sessionCashOrders = useMemo(() => {
    if (!openSession) return [];

    return orders.filter((order) => {
      return (
        order.status === 'paid' &&
        String(order.paymentMethod || '').toLowerCase() === 'dinheiro' &&
        order.cashSessionId === openSession.id
      );
    });
  }, [orders, openSession]);

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
    if (printJob) {
      const timer = setTimeout(() => {
        window.print();
        setPrintJob(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [printJob]);

  React.useEffect(() => {
    const fetchOpenSession = async () => {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'open')
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
  }, [cashTarget, payTarget, mesaPaymentTarget]);

  const handleOpenMesa = (mesa: Mesa) => {
    setSelectedMesa(mesa);
  };

  const handleFinalizeMesa = () => {
    if (!selectedMesa || !selectedMesaOrders.length) {
      toast.error('Essa mesa não possui consumo em aberto.');
      return;
    }

    setMesaPaymentTarget({
      mesa: selectedMesa,
      orders: selectedMesaOrders,
      total: selectedMesaTotal,
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
                  className={`text-left rounded-2xl border p-4 min-h-[165px] transition-all hover:-translate-y-1 hover:shadow-lg ${
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
                    <p className="text-xs text-muted-foreground">
                      Garçom: <span className="font-bold text-foreground">{mesa.garcomNome || '-'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pedidos: <span className="font-bold text-foreground">{mesaOrders.length}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Itens: <span className="font-bold text-foreground">{totalItens}</span>
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
                onPrintOrder={() => setPrintJob({ order, onlyBatch: false })}
                onPrintBatch={(batch: OrderBatch) =>
                  setPrintJob({ order, batch, onlyBatch: true })
                }
                onAddItems={() => setAddItemsTarget(order)}
                onFinalize={() => setPayTarget(order)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="bg-card border border-border rounded-2xl p-4 shadow-sm print:hidden mt-4">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-black uppercase tracking-wider text-sm text-gray-400">
            Pagos
          </h3>
          <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
            {paidOrders.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {paidOrders.length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground text-center mt-2 italic">
              Sem pedidos pagos
            </p>
          )}

          {paidOrders.map((order) => (
  <div
    key={order.id}
    className="bg-background border border-border rounded-xl p-3"
  >
    <div className="flex justify-between items-start gap-3">
  <div>
    <p className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground inline-block">
      #{String(order.number || 0).padStart(4, '0')}
    </p>
    <p className="font-bold mt-2">{order.customerName}</p>
    <p className="text-xs text-muted-foreground mt-1">
      {order.mesaId ? 'Mesa vinculada' : 'Pedido avulso'}
    </p>
  </div>

  <span className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
    Pago
  </span>
</div>

    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
      <span className="text-sm font-bold">
        {formatMoney(order.total)}
      </span>
      <span className="text-xs text-muted-foreground">
        {format(new Date(order.paidAt || order.createdAt), 'dd/MM HH:mm', {
          locale: ptBR,
        })}
      </span>
    </div>
  </div>
))}
        </div>
      </section>

      <CreateMesaModal
        open={createMesaOpen}
        onClose={() => setCreateMesaOpen(false)}
        onSubmit={async (data) => {
          const ok = await addMesa(data);
          if (ok) setCreateMesaOpen(false);
        }}
      />

      <CreateManyMesasModal
        open={createManyOpen}
        onClose={() => setCreateManyOpen(false)}
        onSubmit={async (data) => {
          const ok = await addMesasEmLote(data);
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
          onAddItems={(order: Order) => {
            setSelectedMesa(null);
            setAddItemsTarget(order);
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
          onFinalize={handleFinalizeMesa}
          onPrintOrder={(order: Order) =>
            setPrintJob({ order, onlyBatch: false })
          }
          onPrintBatch={(order: Order, batch: OrderBatch) =>
            setPrintJob({ order, batch, onlyBatch: true })
          }
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
            className="p-8 rounded-3xl shadow-[0_0_50px_rgba(255,106,0,0.15)] max-w-md w-full mx-4 border border-gray-800 animate-slide-up"
          >
            <div className="flex flex-col items-center mb-6 border-b border-gray-800 pb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-black text-center mb-1">
                Finalizar Mesa {mesaPaymentTarget.mesa.numero}
              </h3>
              <p className="text-muted-foreground text-sm">
                {mesaPaymentTarget.orders.length} pedido(s) em aberto
              </p>
              <p className="text-3xl font-black text-white mt-4 tracking-tight">
                {formatMoney(mesaPaymentTarget.total)}
              </p>
            </div>

            <div className="space-y-3 mb-6">
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
                  setSelectedMesa(null);
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
                  setSelectedMesa(null);
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
                  setSelectedMesa(null);
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
            className="p-8 rounded-3xl shadow-[0_0_50px_rgba(255,106,0,0.15)] max-w-sm w-full mx-4 border border-gray-800 animate-slide-up"
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
                    <p className="text-sm text-muted-foreground">Total do pedido</p>
                    <p className="text-3xl font-black text-white">R$ {cashTarget.total.toFixed(2)}</p>
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
                  <span className="font-bold text-white">R$ {cashTarget.total.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Recebido</span>
                  <span className="font-bold text-white">
                    R$ {!Number.isNaN(cashReceivedValue) && cashReceived ? cashReceivedValue.toFixed(2) : '0.00'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Disponível para troco</span>
                  <span className="font-bold text-white">R$ {availableCashForChange.toFixed(2)}</span>
                </div>

                <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground">Troco necessário</span>
                  <span className={`text-2xl font-black ${cashChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    R$ {cashChange.toFixed(2)}
                  </span>
                </div>

                {cashReceived && cashChange < 0 && (
                  <p className="text-xs text-red-400 font-medium">
                    O valor recebido é menor que o total do pedido.
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
                      setSelectedMesa(null);
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

      {printJob && (
        <div className="hidden print:block bg-white text-black p-0 m-0 w-[58mm] font-mono">
          <div style={{ width: '54mm', padding: '2px', color: '#000', background: '#fff', fontSize: '12px' }}>
            <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px' }}>
              {removerAcentos('GARDENS LANCHES')}
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '5px' }}>
              {removerAcentos(printJob.onlyBatch ? 'ADICIONAL COZINHA' : 'PRODUCAO COZINHA')}
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              PEDIDO: #{printJob.order.number ? printJob.order.number.toString().padStart(4, '0') : '0000'}
            </div>

            {printDate && <div>DATA: {format(new Date(printDate), 'HH:mm:ss')}</div>}

            <div style={{ marginBottom: '4px' }}>
              CLIENTE: {removerAcentos(printJob.order.customerName)}
            </div>

            {printJob.onlyBatch && <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>ITENS ADICIONADOS</div>}

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', margin: '4px 0' }}>
              {itemsToPrint.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      paddingRight: '8px',
                      wordBreak: 'break-word',
                      lineHeight: '1.2',
                    }}
                  >
                    - <span style={{ fontWeight: 'bold' }}>{item.quantity}un</span> - {removerAcentos(item.productName)}
                  </div>

                  <div style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold' }}>
                    R$ {(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            <div style={{ fontWeight: 'bold', fontSize: '15px', textAlign: 'right', marginTop: '2px' }}>
              TOTAL: R$ {totalToPrint.toFixed(2)}
            </div>

            {notesToPrint && (
              <div style={{ marginTop: '8px' }}>
                {processarNota(notesToPrint).textoObs && (
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>OBS:</span>
                    <br />
                    <div style={{ background: '#eee', padding: '3px', border: '1px solid #000', fontSize: '11px' }}>
                      {removerAcentos(processarNota(notesToPrint).textoObs)}
                    </div>
                  </div>
                )}

                {processarNota(notesToPrint).tipo && (
                  <div
                    style={{
                      textAlign: 'center',
                      fontWeight: 'black',
                      fontSize: '14px',
                      border: '2px solid #000',
                      padding: '4px',
                      marginTop: '5px',
                    }}
                  >
                    {processarNota(notesToPrint).tipo}
                  </div>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', marginTop: '15px' }}>
              (Gardens)
            </div>
            <div style={{ textAlign: 'center', fontSize: '8px', marginTop: '10px' }}>.</div>
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
  onSubmit: (data: { numero: number; nome?: string; garcomNome?: string }) => void;
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
  onPrintOrder,
  onPrintBatch,
  onAddItems,
  onFinalize,
}: {
  order: Order;
  onPrintOrder: () => void;
  onPrintBatch: (batch: OrderBatch) => void;
  onAddItems: () => void;
  onFinalize: () => void;
}) {
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

        <button
          onClick={onPrintOrder}
          className="flex items-center gap-1 text-[11px] font-black bg-orange-500 text-white px-2.5 py-1.5 rounded-lg"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </button>
      </div>

      <div className="space-y-3 mb-3">
        {batches.map((batch, index) => (
          <div key={batch.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                {batch.isAdditional ? `Adição ${index}` : 'Pedido principal'}
              </p>

              {batch.isAdditional && (
                <button
                  onClick={() => onPrintBatch(batch)}
                  className="text-[10px] font-bold border border-border px-2 py-1 rounded-md"
                >
                  Adicional
                </button>
              )}
            </div>

            <div className="space-y-1">
              {batch.items.map((item, idx) => (
                <div key={`${batch.id}-${idx}`} className="flex justify-between text-sm">
                  <span>
                    <span className="font-black text-primary mr-1">{item.quantity}x</span>
                    {item.productName}
                  </span>
                  <span>{formatMoney(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-border">
        <span className="font-bold">{formatMoney(order.total)}</span>

        <div className="flex gap-2">
          <button
            onClick={onAddItems}
            className="flex items-center gap-2 text-xs font-bold px-3 py-2 bg-primary/10 text-primary rounded-md"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar
          </button>

          <button
            onClick={onFinalize}
            className="flex items-center gap-2 text-xs font-black px-3 py-2 bg-green-600 text-white rounded-md"
          >
            <CreditCard className="w-4 h-4" />
            Finalizar
          </button>
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
  onAddItems,
  onOpenOrder,
  onEditMesa,
  onDeleteMesa,
  onFinalize,
  onPrintOrder,
  onPrintBatch,
  onEditItem,
  onDeleteItem,
}: {
  mesa: Mesa;
  orders: Order[];
  total: number;
  onClose: () => void;
  onAddItems: (order: Order) => void;
  onOpenOrder: () => void;
  onEditMesa: () => void;
  onDeleteMesa: () => void;
  onFinalize: () => void;
  onPrintOrder: (order: Order) => void;
  onPrintBatch: (order: Order, batch: OrderBatch) => void;
  onEditItem: (order: Order, item: OrderItem) => void;
  onDeleteItem: (order: Order, item: OrderItem) => void;
}) {
  const isOccupied = orders.length > 0;

  const totalItensMesa = orders.reduce((sum, order) => {
    return (
      sum +
      (order.items ?? []).reduce((acc, item) => acc + Number(item.quantity || 0), 0)
    );
  }, 0);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4 print:hidden">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl border border-gray-800 bg-[#111] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Detalhes da Mesa
            </p>
            <h3 className="mt-1 text-3xl font-black">Mesa {mesa.numero}</h3>
            <p className="mt-1 text-sm text-gray-400">
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
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-800 p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoCard
              label="Status"
              value={isOccupied ? 'Ocupada' : 'Livre'}
              highlight={isOccupied ? 'warning' : 'success'}
            />
            <InfoCard label="Pedidos" value={String(orders.length)} />
            <InfoCard label="Itens" value={String(totalItensMesa)} />
            <InfoCard label="Total" value={formatMoney(total)} highlight="primary" />
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-6">
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
            <div className="space-y-4">
              {orders.map((order: Order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Pedido #{String(order.number).padStart(4, '0')}
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {order.customerName || `Mesa ${mesa.numero}`}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {order.createdBy && (
                          <span className="rounded-md border border-gray-700 bg-black/30 px-2 py-1 text-[11px] font-bold text-gray-300">
                            por {order.createdBy}
                          </span>
                        )}

                        <span className="rounded-md border border-gray-700 bg-black/30 px-2 py-1 text-[11px] font-bold text-gray-300">
                          {format(new Date(order.createdAt), 'dd/MM HH:mm', {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onPrintOrder(order)}
                        className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-white"
                      >
                        <Printer className="h-4 w-4" />
                        Pedido
                      </button>

                      <button
                        type="button"
                        onClick={() => onAddItems(order)}
                        className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Adicionar pedido
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(order.itemBatches ?? []).map((batch: OrderBatch, index: number) => {
                      const batchLabel = batch.isAdditional
                        ? `Adição ${index}`
                        : 'Pedido principal';

                      const obs = processarNota(batch.notes || '').textoObs;

                      return (
                        <div
                          key={batch.id}
                          className="rounded-xl border border-gray-800 bg-black/20 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-primary">
                                {batchLabel}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {format(new Date(batch.createdAt), 'HH:mm', {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>

                            {batch.isAdditional && (
                              <button
                                type="button"
                                onClick={() => onPrintBatch(order, batch)}
                                className="flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-[10px] font-bold"
                              >
                                <Printer className="h-3 w-3" />
                                Imprimir adicional
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {batch.items.map((item: OrderItem, idx: number) => (
                              <div
                                key={`${batch.id}-${idx}-${item.id ?? item.productId}`}
                                className="flex items-center justify-between gap-4 rounded-lg border border-gray-800 bg-[#121212] px-3 py-2 text-sm"
                              >
                                <div className="flex-1">
                                  <span className="mr-1 font-black text-primary">
                                    {item.quantity}x
                                  </span>
                                  {item.productName}
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-bold min-w-[80px] text-right">
                                    {formatMoney(item.quantity * item.unitPrice)}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => onEditItem(order, item)}
                                    className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2 text-blue-400"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onDeleteItem(order, item)}
                                    className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {obs && (
                            <div className="mt-2 rounded-lg border-l-2 border-gray-600 bg-gray-800/50 p-2 text-xs italic text-gray-300">
                              {obs}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
                    <p className="text-sm text-gray-400">Total do pedido</p>
                    <p className="text-lg font-black">{formatMoney(order.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-400">Total da mesa</p>
              <p className="text-3xl font-black">{formatMoney(total)}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isOccupied && (
                <>
                  <button
                    type="button"
                    onClick={onOpenOrder}
                    className="rounded-xl bg-primary px-4 py-3 font-black text-primary-foreground"
                  >
                    Abrir pedido
                  </button>

                  <button
                    type="button"
                    onClick={onEditMesa}
                    className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 font-bold text-blue-400"
                  >
                    Editar mesa
                  </button>

                  <button
                    type="button"
                    onClick={onDeleteMesa}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-400"
                  >
                    Excluir mesa
                  </button>
                </>
              )}

              {isOccupied && (
                <button
                  type="button"
                  onClick={onFinalize}
                  className="rounded-xl bg-green-600 px-5 py-3 font-black text-white"
                >
                  Finalizar pagamento
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className={`mt-2 text-xl font-black ${highlightClass}`}>{value}</p>
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
  }).format(val);
}