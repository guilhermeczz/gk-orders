import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AppHeader } from '@/components/AppHeader';
import {
  ArrowLeft,
  CheckCircle2,
  Search,
  CreditCard,
  Banknote,
  DollarSign,
  CalendarDays,
  Receipt,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useAppStore } from '@/lib/store';

function formatMoney(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(val || 0));
}

function money(v: number) {
  return Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toInputDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromInputDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function getPaymentMethodLabel(method?: string | null) {
  const normalized = String(method || '').toLowerCase().trim();

  if (normalized === 'dinheiro') return 'Dinheiro';
  if (normalized === 'pix') return 'PIX';
  if (normalized === 'credito' || normalized === 'crédito') return 'Crédito';
  if (normalized === 'debito' || normalized === 'débito') return 'Débito';

  return 'Não definido';
}

function getPaymentIcon(method?: string | null) {
  const normalized = String(method || '').toLowerCase().trim();

  if (normalized === 'dinheiro') return <Banknote className="w-4 h-4" />;
  if (normalized === 'pix') return <DollarSign className="w-4 h-4" />;

  return <CreditCard className="w-4 h-4" />;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function PaidOrdersPage() {
  const { orders } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toInputDate(d);
  });

  const [endDate, setEndDate] = useState(() => toInputDate(new Date()));

  const paidOrders = useMemo(() => {
    return orders
      .filter((order) => order.status === 'paid' || order.paid)
      .sort(
        (a, b) =>
          new Date(b.paidAt || b.createdAt).getTime() -
          new Date(a.paidAt || a.createdAt).getTime()
      );
  }, [orders]);

  const paidOrdersByDate = useMemo(() => {
    const startBase = fromInputDate(startDate);
    const endBase = fromInputDate(endDate);

    const start = new Date(
      startBase.getFullYear(),
      startBase.getMonth(),
      startBase.getDate(),
      0,
      0,
      0,
      0
    );

    const end = new Date(
      endBase.getFullYear(),
      endBase.getMonth(),
      endBase.getDate(),
      23,
      59,
      59,
      999
    );

    return paidOrders.filter((order) => {
      const date = new Date(order.paidAt || order.createdAt);
      return date >= start && date <= end;
    });
  }, [paidOrders, startDate, endDate]);

  const filteredPaidOrders = useMemo(() => {
    const q = normalizeText(searchTerm);

    if (!q) return paidOrdersByDate;

    return paidOrdersByDate.filter((order) => {
      const number = String(order.number || '');
      const customer = normalizeText(String(order.customerName || ''));
      const method = normalizeText(getPaymentMethodLabel(order.paymentMethod));
      const total = String(Number(order.total || 0).toFixed(2));

      return (
        number.includes(q) ||
        customer.includes(q) ||
        method.includes(q) ||
        total.includes(q)
      );
    });
  }, [paidOrdersByDate, searchTerm]);

  const totalPaid = useMemo(() => {
    return filteredPaidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [filteredPaidOrders]);

  const totalToday = useMemo(() => {
    const today = new Date().toDateString();

    return paidOrders
      .filter((order) => new Date(order.paidAt || order.createdAt).toDateString() === today)
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [paidOrders]);

  const paymentStats = useMemo(() => {
    const totals = {
      dinheiro: 0,
      pix: 0,
      credito: 0,
      debito: 0,
      naoDefinido: 0,
    };

    filteredPaidOrders.forEach((order) => {
      const valor = Number(order.total || 0);
      const method = String(order.paymentMethod || '').toLowerCase().trim();

      if (method === 'dinheiro') totals.dinheiro += valor;
      else if (method === 'pix') totals.pix += valor;
      else if (method.includes('credito') || method.includes('crédito')) totals.credito += valor;
      else if (method.includes('debito') || method.includes('débito')) totals.debito += valor;
      else totals.naoDefinido += valor;
    });

    return totals;
  }, [filteredPaidOrders]);

  const handleDownloadPDF = () => {
    if (filteredPaidOrders.length === 0) {
      toast.error('Não há pedidos pagos neste filtro para gerar PDF.');
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(255, 106, 0);
    doc.text('GK ORDERS', 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório de Pedidos Pagos', 14, 32);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Período: ${fromInputDate(startDate).toLocaleDateString('pt-BR')} até ${fromInputDate(endDate).toLocaleDateString('pt-BR')}`,
      14,
      39
    );

    if (searchTerm.trim()) {
      doc.text(`Filtro de busca: ${searchTerm.trim()}`, 14, 44);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 49);
    } else {
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 44);
    }

    autoTable(doc, {
      startY: searchTerm.trim() ? 57 : 52,
      head: [['Resumo', 'Valor']],
      body: [
        ['Total de pedidos pagos', String(filteredPaidOrders.length)],
        ['Total faturado', `R$ ${money(totalPaid)}`],
        ['Dinheiro', `R$ ${money(paymentStats.dinheiro)}`],
        ['PIX', `R$ ${money(paymentStats.pix)}`],
        ['Crédito', `R$ ${money(paymentStats.credito)}`],
        ['Débito', `R$ ${money(paymentStats.debito)}`],
        ['Não definido', `R$ ${money(paymentStats.naoDefinido)}`],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 106, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    const tableData = filteredPaidOrders.map((order) => [
      `#${String(order.number || 0).padStart(4, '0')}`,
      new Date(order.paidAt || order.createdAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      order.customerName || 'Pedido',
      getPaymentMethodLabel(order.paymentMethod),
      String(order.paymentMethod || '').toLowerCase() === 'dinheiro'
        ? `R$ ${money(Number(order.amountReceived || 0))}`
        : '-',
      String(order.paymentMethod || '').toLowerCase() === 'dinheiro'
        ? `R$ ${money(Number(order.changeGiven || 0))}`
        : '-',
      `R$ ${money(Number(order.total || 0))}`,
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Pedido', 'Data / Hora', 'Cliente', 'Pagamento', 'Recebido', 'Troco', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 8.5, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`Pedidos_Pagos_Gk_${startDate}_a_${endDate}.pdf`);
    toast.success('PDF de pedidos pagos gerado!');
  };

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl bg-[#111] text-white border border-gray-800 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.3)] transition-all font-bold [color-scheme:dark]';

  return (
    <>
      <div className="print:hidden">
        <AppHeader />
      </div>

      <div className="min-h-screen bg-background pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-border pb-4">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all active:scale-95 shadow-sm hover:-translate-x-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <h1 className="text-3xl font-black text-primary drop-shadow-sm flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8" />
                  Pedidos Pagos
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Consulte os pedidos finalizados por período e exporte em PDF.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={filteredPaidOrders.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-background border border-border hover:border-primary hover:text-primary text-foreground rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5 mb-8 grid grid-cols-1 md:grid-cols-3 gap-5 shadow-sm">
            <div>
              <label className="text-xs font-black text-muted-foreground block mb-2 uppercase tracking-widest">
                <CalendarDays className="w-4 h-4 inline mr-1 mb-0.5" /> Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-black text-muted-foreground block mb-2 uppercase tracking-widest">
                <CalendarDays className="w-4 h-4 inline mr-1 mb-0.5" /> Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-black text-muted-foreground block mb-2 uppercase tracking-widest">
                <Search className="w-4 h-4 inline mr-1 mb-0.5" /> Buscar
              </label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pedido, cliente, pagamento ou valor..."
                className="w-full bg-white text-black placeholder:text-gray-400 border border-border rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-green-500 font-black text-xs uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Pagos encontrados
              </div>
              <p className="text-3xl font-black text-foreground">{filteredPaidOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Conforme filtro atual</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider mb-2">
                <Receipt className="w-4 h-4" />
                Total filtrado
              </div>
              <p className="text-3xl font-black text-foreground">{formatMoney(totalPaid)}</p>
              <p className="text-xs text-muted-foreground mt-1">Soma dos pedidos listados</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-wider mb-2">
                <CalendarDays className="w-4 h-4" />
                Total de hoje
              </div>
              <p className="text-3xl font-black text-foreground">{formatMoney(totalToday)}</p>
              <p className="text-xs text-muted-foreground mt-1">Pedidos pagos no dia</p>
            </div>
          </div>

          <div className="space-y-3">
            {filteredPaidOrders.length === 0 && (
              <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-bold text-foreground">Nenhum pedido pago encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Altere o período ou finalize um pedido para ele aparecer nesta aba.
                </p>
              </div>
            )}

            {filteredPaidOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/50 transition-all hover:-translate-y-0.5"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-black bg-muted px-2 py-1 rounded-md text-muted-foreground text-xs">
                        #{String(order.number || 0).padStart(4, '0')}
                      </span>

                      <span className="font-black text-lg text-foreground">
                        {order.customerName || 'Pedido'}
                      </span>

                      <span className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
                        Pago
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">
                      {format(new Date(order.paidAt || order.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>

                    <p className="text-sm text-muted-foreground/90 italic border-l-2 border-border pl-3">
                      {(order.items ?? [])
                        .map((item) => `${item.quantity}x ${item.productName}`)
                        .join(' • ') || 'Sem itens'}
                    </p>

                    {String(order.paymentMethod || '').toLowerCase() === 'dinheiro' && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-background border border-border rounded-lg px-3 py-2">
                          <span className="text-muted-foreground">Recebido:</span>{' '}
                          <span className="font-bold text-green-500">
                            {formatMoney(Number(order.amountReceived || 0))}
                          </span>
                        </div>

                        <div className="bg-background border border-border rounded-lg px-3 py-2">
                          <span className="text-muted-foreground">Troco:</span>{' '}
                          <span className="font-bold text-orange-500">
                            {formatMoney(Number(order.changeGiven || 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 md:min-w-[160px]">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-black uppercase text-muted-foreground">
                      {getPaymentIcon(order.paymentMethod)}
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </div>

                    <div className="font-black text-xl text-foreground bg-background px-4 py-2 rounded-xl border border-border shadow-inner">
                      {formatMoney(Number(order.total || 0))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}