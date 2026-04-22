import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus, OrderBatch } from '@/lib/types';
import {
  ListTodo,
  ChefHat,
  CheckCircle2,
  CreditCard,
  ChevronRight,
  Trash2,
  Printer,
  PlusCircle,
  Search,
  Banknote,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NewOrderModal } from './NewOrderModal';

const columns: {
  status: OrderStatus;
  label: string;
  icon: React.ElementType;
  colorText: string;
  colorBorder: string;
  nextAction?: OrderStatus;
}[] = [
  { status: 'new', label: 'Novos', icon: ListTodo, colorText: 'text-blue-500', colorBorder: 'border-t-blue-500', nextAction: 'preparing' },
  { status: 'preparing', label: 'Preparando', icon: ChefHat, colorText: 'text-orange-500', colorBorder: 'border-t-orange-500', nextAction: 'ready' },
  { status: 'ready', label: 'Prontos', icon: CheckCircle2, colorText: 'text-green-500', colorBorder: 'border-t-green-500', nextAction: 'paid' },
  { status: 'paid', label: 'Pagos', icon: CreditCard, colorText: 'text-gray-500', colorBorder: 'border-t-gray-600' },
];

const removerAcentos = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const processarNota = (notes: string) => {
  if (!notes) return { tipo: '', textoObs: '' };
  const regex = /\[(LOCAL|DELIVERY|RETIRADA)\]/i;
  const match = notes.match(regex);
  const tipo = match ? match[1].toUpperCase() : '';
  const textoObs = notes.replace(regex, '').trim();
  return { tipo, textoObs };
};

type PrintJob = {
  order: Order;
  batch?: OrderBatch | null;
  onlyBatch: boolean;
};

export function KanbanBoard({ onEditOrder }: { onEditOrder?: (order: Order) => void }) {
  const store = useAppStore();
  const todayOrders = store.getTodayOrders?.() ?? [];
  const deleteOrder = store.deleteOrder ?? (() => {});
  const { moveOrder, payOrder, orders } = useAppStore();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<Order | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [addItemsTarget, setAddItemsTarget] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [cashTarget, setCashTarget] = useState<Order | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [openSession, setOpenSession] = useState<any | null>(null);

  useEffect(() => {
    if (printJob) {
      const timer = setTimeout(() => {
        window.print();
        setPrintJob(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [printJob]);

  useEffect(() => {
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
  }, [cashTarget, payTarget]);

  const filteredOrders = useMemo(() => {
    const q = removerAcentos(searchTerm.trim().toLowerCase());
    if (!q) return todayOrders;

    return todayOrders.filter((order) => {
      const customer = removerAcentos(String(order.customerName || '').toLowerCase());
      const number = String(order.number || '');
      return customer.includes(q) || number.includes(q);
    });
  }, [todayOrders, searchTerm]);

  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, Order[]> = {
      new: [],
      preparing: [],
      ready: [],
      paid: [],
    };

    filteredOrders.forEach((o) => {
      if (grouped[o.status]) grouped[o.status].push(o);
    });

    return grouped;
  }, [filteredOrders]);

  const itemsToPrint = printJob?.onlyBatch ? printJob.batch?.items ?? [] : printJob?.order.items ?? [];
  const notesToPrint = printJob?.onlyBatch ? printJob?.batch?.notes ?? '' : printJob?.order.notes ?? '';
  const totalToPrint = itemsToPrint.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const printDate = printJob?.onlyBatch ? printJob?.batch?.createdAt : printJob?.order.createdAt;

  const normalizeMoneyInput = (value: string) => {
    const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
    return Number(cleaned);
  };

  const cashReceivedValue = normalizeMoneyInput(cashReceived);

  const cashChange =
    cashTarget && !Number.isNaN(cashReceivedValue)
      ? cashReceivedValue - cashTarget.total
      : 0;

  const sessionCashOrders = useMemo(() => {
    if (!openSession) return [];

    return orders.filter((order: any) => {
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
      (sum: number, order: any) => sum + Number(order.amountReceived || 0),
      0
    );

    const totalChangeGiven = sessionCashOrders.reduce(
      (sum: number, order: any) => sum + Number(order.changeGiven || 0),
      0
    );

    return openingAmount + totalReceivedCash - totalChangeGiven;
  }, [openSession, sessionCashOrders]);

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

  return (
    <>
      <div className="print:hidden mb-4">
        <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Filtro de atendimento
            </p>
            <p className="text-sm text-muted-foreground">
              Busque por cliente, mesa ou número do pedido
            </p>
          </div>

          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ex: Mesa 05, João, 0005..."
              className="w-full bg-white text-black placeholder:text-gray-400 border border-border rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {columns.map((col) => {
          const colOrders = ordersByStatus[col.status] ?? [];
          return (
            <div
              key={col.status}
              className={`bg-card border border-border border-t-4 ${col.colorBorder} rounded-2xl p-3 flex flex-col min-h-[70vh] shadow-sm ${col.status === 'paid' ? 'opacity-90' : ''}`}
            >
              <div className="mb-3 border-b border-border pb-2 flex justify-between items-center">
                <h3 className={`font-black uppercase flex gap-2 items-center tracking-wider text-sm ${col.colorText}`}>
                  <col.icon className="w-4 h-4" />
                  {col.label}
                </h3>
                <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {colOrders.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-8 italic">
                    {searchTerm ? 'Nenhum pedido encontrado' : 'Sem pedidos'}
                  </p>
                )}

                {colOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    nextAction={col.nextAction}
                    onEdit={onEditOrder ? () => onEditOrder(order) : undefined}
                    onAddItems={() => setAddItemsTarget(order)}
                    onDelete={() => setDeleteTarget(order.id)}
                    onPrintOrder={() => setPrintJob({ order, onlyBatch: false })}
                    onPrintBatch={(batch: OrderBatch) => setPrintJob({ order, batch, onlyBatch: true })}
                    onPay={() => setPayTarget(order)}
                    moveOrder={moveOrder}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {printJob && (
        <div className="hidden print:block bg-white text-black p-0 m-0 w-[58mm] font-mono">
          <div style={{ width: '54mm', padding: '2px', color: '#000', background: '#fff', fontSize: '12px' }}>
            <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px' }}>
              {removerAcentos('GARDENS LANCHES')}
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '5px' }}>
              {removerAcentos(printJob.onlyBatch ? 'ADICIONAL COZINHA' : 'PRODUCAO COZINHA')}
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div>

            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              PEDIDO: #{printJob.order.number ? printJob.order.number.toString().padStart(4, '0') : '0000'}
            </div>

            {printDate && <div>DATA: {format(new Date(printDate), 'HH:mm:ss')}</div>}

            <div style={{ marginBottom: '4px' }}>
              CLIENTE: {removerAcentos(printJob.order.customerName)}
            </div>

            {printJob.onlyBatch && <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>ITENS ADICIONADOS</div>}

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div>

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

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div>

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

      {addItemsTarget && (
        <NewOrderModal
          open={!!addItemsTarget}
          onClose={() => setAddItemsTarget(null)}
          appendOrderId={addItemsTarget.id}
          initialCustomerName={addItemsTarget.customerName}
          appendBaseNotes={addItemsTarget.notes}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[999] print:hidden">
          <div
            style={{ backgroundColor: '#111', color: '#fff' }}
            className="p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-gray-800"
          >
            <h3 className="text-xl font-bold text-center mb-6">Excluir Pedido?</h3>
            <div className="flex gap-3 justify-center">
              <button
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
                onClick={() => {
                  deleteOrder(deleteTarget);
                  setDeleteTarget(null);
                }}
              >
                Excluir
              </button>
            </div>
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
                onClick={() => {
                  payOrder(payTarget.id, 'pix');
                  setPayTarget(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-500 rounded-2xl font-black transition-all"
              >
                PIX
              </button>

              <button
                onClick={() => {
                  payOrder(payTarget.id, 'credito');
                  setPayTarget(null);
                }}
                className="py-4 flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500 rounded-2xl font-black transition-all"
              >
                Crédito
              </button>

              <button
                onClick={() => {
                  payOrder(payTarget.id, 'debito');
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
    await payOrder(cashTarget.id, 'dinheiro', {
      amountReceived: cashReceivedValue,
      changeGiven: cashChange,
    });

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

function OrderCard({
  order,
  nextAction,
  onEdit,
  onAddItems,
  onDelete,
  onPrintOrder,
  onPrintBatch,
  onPay,
  moveOrder,
}: any) {
  const displayId = order.number ? order.number.toString().padStart(4, '0') : '0000';

  const { tipo } = processarNota(order.notes || '');

  const badgeColor =
    tipo === 'DELIVERY'
      ? 'bg-red-500/20 text-red-500 border-red-500/30'
      : tipo === 'LOCAL'
        ? 'bg-green-500/20 text-green-500 border-green-500/30'
        : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';

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
    <div className="bg-background border border-border rounded-xl p-3 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group">
      {tipo && (
        <div className="mb-2">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${badgeColor}`}>
            {tipo}
          </span>
        </div>
      )}

      <div className="flex justify-between items-start mb-3 gap-3">
        <div>
          <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground">
            #{displayId}
          </span>
          <p className="font-bold mt-1.5 text-sm">{order.customerName}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {format(new Date(order.createdAt), 'HH:mm', { locale: ptBR })}
          </span>

          <button
            onClick={onPrintOrder}
            className="flex items-center gap-1.5 text-[11px] font-black bg-orange-500 text-white px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-orange-600 transition-all active:scale-95 opacity-90 group-hover:opacity-100"
          >
            <Printer className="w-3.5 h-3.5" />
            IMPRIMIR PEDIDO
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-3 border-t border-border/50 pt-2">
        {batches.map((batch, index) => {
          const additionalIndex = batches.slice(0, index + 1).filter((b: OrderBatch) => b.isAdditional).length;
          const obs = processarNota(batch.notes || '').textoObs;

          return (
            <div
              key={batch.id}
              className={batch.isAdditional ? 'border-t border-dashed border-primary/30 pt-3 mt-3' : ''}
            >
              {batch.isAdditional && (
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-primary">
                      Adição {additionalIndex}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Lançado às {format(new Date(batch.createdAt), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>

                  <button
                    onClick={() => onPrintBatch(batch)}
                    className="flex items-center gap-1 text-[10px] font-black bg-zinc-800 text-white px-2 py-1.5 rounded-md hover:bg-zinc-700 transition-colors"
                  >
                    <Printer className="w-3 h-3" />
                    Imprimir adicional
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {batch.items.map((item: any, idx: number) => (
                  <div key={`${batch.id}-${idx}`} className="text-sm flex justify-between">
                    <span className="text-muted-foreground">
                      <span className="font-bold text-primary mr-1">{item.quantity}x</span> {item.productName}
                    </span>
                  </div>
                ))}
              </div>

              {obs && (
                <div className="text-xs bg-muted/50 p-2 rounded-md mt-2 text-muted-foreground italic border-l-2 border-muted-foreground/30">
                  {obs}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {order.status !== 'paid' && (
          <button
            onClick={onAddItems}
            className="flex items-center gap-2 text-xs font-bold px-3 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-black rounded-md transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar item
          </button>
        )}

        {onEdit && order.status === 'new' && (
          <button
            onClick={onEdit}
            className="text-xs font-bold px-3 py-2 bg-muted hover:bg-primary hover:text-black rounded-md transition-colors"
          >
            Editar
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
        <span className="font-bold text-sm">R$ {order.total.toFixed(2)}</span>

        <div className="flex gap-2">
          {order.status !== 'paid' && (
            <button
              onClick={onDelete}
              className="p-1.5 text-muted-foreground hover:text-white hover:bg-destructive rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {nextAction && (
            <button
              onClick={() => {
                if (nextAction === 'paid') {
                  onPay();
                } else {
                  moveOrder(order.id, nextAction);
                }
              }}
              className="p-1.5 bg-primary text-black rounded-md hover:scale-105 transition-transform"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}