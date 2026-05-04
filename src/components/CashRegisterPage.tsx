import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Loader2,
  CalendarDays,
  Receipt,
  Download,
  Banknote,
  DollarSign,
  CreditCard,
  LockOpen,
  BadgeDollarSign,
  Landmark,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function toInputDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function money(v: number) {
  return Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getPaymentMethodLabel(method?: string | null) {
  const normalized = String(method || '').toLowerCase().trim();

  if (normalized === 'dinheiro') return 'Dinheiro';
  if (normalized === 'pix') return 'PIX';
  if (normalized === 'credito' || normalized === 'crédito') return 'Crédito';
  if (normalized === 'debito' || normalized === 'débito') return 'Débito';

  return 'Não definido';
}

function parseMoneyInput(value: string) {
  return Number(String(value || '').replace(/\s/g, '').replace(',', '.'));
}

export function CashRegisterPage() {
  const { orders } = useAppStore();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);

  const [historyDate, setHistoryDate] = useState(() => toInputDate(new Date()));
  const [dailyClosings, setDailyClosings] = useState<any[]>([]);

  const [openSession, setOpenSession] = useState<any | null>(null);

  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');

  const [step, setStep] = useState<'initial' | 'difference' | 'closed'>('initial');
  const [countedTotal, setCountedTotal] = useState('');
  const [differenceValue, setDifferenceValue] = useState('');
  const [notes, setNotes] = useState('');

  const fetchOpenSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'open')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar caixa aberto:', error);
      return;
    }

    setOpenSession(data ?? null);
  }, []);

  const fetchHistoryByDate = useCallback(async () => {
    const start = `${historyDate}T00:00:00-03:00`;
    const end = `${historyDate}T23:59:59.999-03:00`;

    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'closed')
      .gte('closed_at', start)
      .lte('closed_at', end)
      .order('closed_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico de caixa:', error);
      return;
    }

    setDailyClosings(data ?? []);
  }, [historyDate]);

  useEffect(() => {
    fetchOpenSession();
  }, [fetchOpenSession]);

  useEffect(() => {
    fetchHistoryByDate();
  }, [fetchHistoryByDate]);

  const sessionPaidOrders = useMemo(() => {
    if (!openSession) return [];

    return orders.filter((o: any) => {
      return o.status === 'paid' && Number(o.cashSessionId) === Number(openSession.id);
    });
  }, [orders, openSession]);

  const expectedTotal = useMemo(() => {
    return sessionPaidOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  }, [sessionPaidOrders]);

  const stats = useMemo(() => {
    const totals = { pix: 0, dinheiro: 0, credito: 0, debito: 0 };

    sessionPaidOrders.forEach((o: any) => {
      const valor = Number(o.total || 0);
      const method = String(o.paymentMethod || '').toLowerCase().trim();

      if (method === 'pix') totals.pix += valor;
      else if (method === 'dinheiro') totals.dinheiro += valor;
      else if (method.includes('credito') || method.includes('crédito')) totals.credito += valor;
      else if (method.includes('debito') || method.includes('débito')) totals.debito += valor;
    });

    return totals;
  }, [sessionPaidOrders]);

  const totalReceivedCash = useMemo(() => {
    return sessionPaidOrders
      .filter((o: any) => String(o.paymentMethod || '').toLowerCase() === 'dinheiro')
      .reduce((sum: number, o: any) => sum + Number(o.amountReceived || 0), 0);
  }, [sessionPaidOrders]);

  const totalChangeGiven = useMemo(() => {
    return sessionPaidOrders
      .filter((o: any) => String(o.paymentMethod || '').toLowerCase() === 'dinheiro')
      .reduce((sum: number, o: any) => sum + Number(o.changeGiven || 0), 0);
  }, [sessionPaidOrders]);

  const openingCash = useMemo(() => {
    return Number(openSession?.opening_amount || 0);
  }, [openSession]);

  const availableChangeNow = useMemo(() => {
    return openingCash + totalReceivedCash - totalChangeGiven;
  }, [openingCash, totalReceivedCash, totalChangeGiven]);

  const handleOpenRegister = async () => {
    const amount = parseMoneyInput(openingAmount);

    if (Number.isNaN(amount) || openingAmount.trim() === '') {
      return toast.error('Informe um valor inicial válido.');
    }

    if (amount < 0) {
      return toast.error('O valor inicial do caixa não pode ser negativo.');
    }

    setLoading(true);

    try {
      const { data: existingOpen, error: existingError } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('status', 'open')
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingOpen) {
        toast.error('Já existe um caixa aberto.');
        await fetchOpenSession();
        return;
      }

      const { error } = await supabase.from('cash_sessions').insert([
        {
          opened_by: user?.name || 'Operador',
          opening_amount: amount,
          notes: openingNotes || null,
          status: 'open',
        },
      ]);

      if (error) throw error;

      toast.success('Caixa aberto com sucesso!');
      setOpeningAmount('');
      setOpeningNotes('');
      setCountedTotal('');
      setDifferenceValue('');
      setNotes('');
      setStep('initial');
      await fetchOpenSession();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir o caixa.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRegister = async (hasDifference: boolean) => {
    if (!openSession) return toast.error('Nenhum caixa aberto encontrado.');

    const counted = parseMoneyInput(countedTotal);

    if (Number.isNaN(counted) || countedTotal.trim() === '') {
      return toast.error('Informe o valor contado no caixa.');
    }

    if (counted < 0) {
      return toast.error('O valor contado não pode ser negativo.');
    }

    let diff = counted - expectedTotal;

    if (hasDifference) {
      const manualDiff = parseMoneyInput(differenceValue);

      if (Number.isNaN(manualDiff) || differenceValue.trim() === '') {
        return toast.error('Digite um valor válido para a diferença.');
      }

      diff = manualDiff;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closed_by: user?.name || 'Operador',
          expected_total: expectedTotal,
          counted_total: counted,
          difference: diff,
          notes: notes || (diff === 0 ? 'Fechamento exato.' : 'Fechamento com divergência.'),
          status: 'closed',
        })
        .eq('id', openSession.id);

      if (error) throw error;

      toast.success('Caixa fechado com sucesso!');
      setStep('closed');
      setCountedTotal('');
      setDifferenceValue('');
      setNotes('');
      await fetchOpenSession();
      await fetchHistoryByDate();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fechar o caixa.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCashPDF = () => {
    if (dailyClosings.length === 0) {
      return toast.error('Não há fechamentos nesta data para gerar PDF.');
    }

    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(255, 106, 0);
    doc.text('GARDENS LANCHES', 14, 20);

    doc.setFontSize(15);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório Profissional de Fechamentos de Caixa', 14, 32);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Data analisada: ${new Date(`${historyDate}T12:00:00`).toLocaleDateString('pt-BR')}`,
      14,
      39
    );
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 44);

    const totalSistema = dailyClosings.reduce((sum, c) => sum + Number(c.expected_total || 0), 0);
    const totalContado = dailyClosings.reduce((sum, c) => sum + Number(c.counted_total || 0), 0);
    const totalDiferenca = dailyClosings.reduce((sum, c) => sum + Number(c.difference || 0), 0);

    autoTable(doc, {
      startY: 52,
      head: [['Resumo', 'Valor']],
      body: [
        ['Total no sistema', `R$ ${money(totalSistema)}`],
        ['Total contado', `R$ ${money(totalContado)}`],
        ['Diferença líquida', `R$ ${money(totalDiferenca)}`],
        ['Fechamentos do dia', String(dailyClosings.length)],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 106, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    const tableData = dailyClosings.map((closing) => {
      const rawDate = closing.closed_at || closing.created_at;
      const dateText = rawDate
        ? new Date(rawDate).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
        : '-';

      return [
        dateText,
        closing.opened_by || '-',
        closing.closed_by || '-',
        `R$ ${money(Number(closing.opening_amount || 0))}`,
        `R$ ${money(Number(closing.expected_total || 0))}`,
        `R$ ${money(Number(closing.counted_total || 0))}`,
        `R$ ${money(Number(closing.difference || 0))}`,
        closing.notes || '-',
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Data/Hora', 'Aberto por', 'Fechado por', 'Inicial', 'Sistema', 'Contado', 'Diferença', 'Observação']],
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

    doc.save(`Caixa_Gardens_${historyDate}.pdf`);
    toast.success('Download do PDF de Caixa iniciado!');
  };

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl bg-[#111] text-white border border-gray-800 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.3)] transition-all font-bold [color-scheme:dark]';

  return (
    <>
      <div className="print:hidden">
        <AppHeader />
      </div>

      <div className="min-h-screen bg-background pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-8 border-b border-border pb-4">
            <Link
              to="/dashboard"
              className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all active:scale-95 shadow-sm hover:-translate-x-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <h2 className="text-3xl font-black text-primary drop-shadow-sm flex items-center gap-3">
              <Wallet className="w-8 h-8" /> Controle de Caixa
            </h2>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lg mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Situação do Caixa
                </p>
                <h3 className="text-2xl font-black text-foreground">
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </h3>
              </div>

              <div className="bg-background border border-border px-4 py-2 rounded-xl">
                <p className="text-xs font-bold text-muted-foreground mb-0.5 uppercase text-center">
                  Operador
                </p>
                <p className="font-black text-primary">{user?.name || 'Usuário Logado'}</p>
              </div>
            </div>

            {!openSession ? (
              <div className="bg-background border border-border rounded-2xl p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <LockOpen className="w-6 h-6 text-green-500" />
                  <h4 className="text-xl font-black text-foreground">Abrir Caixa</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="text-sm font-bold text-gray-400 mb-2 block">
                      Valor inicial do caixa
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex: 100.00"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-400 mb-2 block">
                      Observação de abertura
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: troco inicial"
                      value={openingNotes}
                      onChange={(e) => setOpeningNotes(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  onClick={handleOpenRegister}
                  disabled={loading}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LockOpen className="w-5 h-5" /> Abrir Caixa
                    </>
                  )}
                </button>
              </div>
            ) : step === 'closed' ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center animate-slide-up">
                <FileCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-2xl font-black text-green-500 mb-2">Caixa Fechado!</h4>
                <p className="text-muted-foreground">O fechamento deste turno foi salvo no sistema.</p>

                <button
                  onClick={async () => {
                    setStep('initial');
                    setDifferenceValue('');
                    setNotes('');
                    setCountedTotal('');
                    await fetchOpenSession();
                    await fetchHistoryByDate();
                  }}
                  className="mt-6 px-6 py-3 bg-background border border-border hover:border-primary text-foreground rounded-xl font-bold transition-all"
                >
                  Atualizar Tela
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-green-500">Caixa Aberto</p>
                    <p className="font-bold text-foreground">
                      Abertura: {new Date(openSession.opened_at).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Aberto por: <span className="font-bold">{openSession.opened_by || '-'}</span>
                    </p>
                  </div>

                  <div className="bg-background border border-border px-4 py-3 rounded-xl">
                    <p className="text-[10px] uppercase font-black text-muted-foreground">Fundo inicial</p>
                    <p className="text-xl font-black text-primary">R$ {money(openingCash)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard label="Dinheiro" value={stats.dinheiro} icon={<Banknote className="w-4 h-4" />} color="text-green-500" />
                  <StatCard label="PIX" value={stats.pix} icon={<DollarSign className="w-4 h-4" />} color="text-teal-500" />
                  <StatCard label="Crédito" value={stats.credito} icon={<CreditCard className="w-4 h-4" />} color="text-blue-500" />
                  <StatCard label="Débito" value={stats.debito} icon={<CreditCard className="w-4 h-4" />} color="text-purple-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-inner">
                    <p className="text-sm font-bold text-gray-400 mb-1">Pedidos Recebidos</p>
                    <p className="text-4xl font-black text-white">{sessionPaidOrders.length}</p>
                  </div>

                  <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 shadow-inner">
                    <p className="text-sm font-bold text-primary mb-1">Total do Turno</p>
                    <p className="text-4xl font-black text-foreground">R$ {money(expectedTotal)}</p>
                  </div>

                  <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-inner">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-2">
                      <BadgeDollarSign className="w-4 h-4" />
                      Recebido em dinheiro
                    </div>
                    <p className="text-2xl font-black text-white">R$ {money(totalReceivedCash)}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Troco devolvido:{' '}
                      <span className="font-black text-orange-500">R$ {money(totalChangeGiven)}</span>
                    </p>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 shadow-inner">
                    <div className="flex items-center gap-2 text-sm font-bold text-green-500 mb-2">
                      <Landmark className="w-4 h-4" />
                      Disponível p/ troco
                    </div>
                    <p className="text-2xl font-black text-white">R$ {money(availableChangeNow)}</p>
                    <p className="text-sm text-green-300/80 mt-2">Inicial + recebido - troco</p>
                  </div>
                </div>

                {step === 'initial' ? (
                  <div className="bg-background border border-border rounded-2xl p-6 text-center animate-fade-in">
                    <h4 className="text-xl font-black text-foreground mb-2">Conferir e fechar o caixa?</h4>
                    <p className="text-muted-foreground text-sm mb-6">
                      Informe o valor contado fisicamente antes de concluir.
                    </p>

                    <div className="max-w-md mx-auto mb-6">
                      <label className="text-sm font-bold text-gray-400 mb-2 block text-left">
                        Valor contado no caixa
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 350.00"
                        value={countedTotal}
                        onChange={(e) => setCountedTotal(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => handleCloseRegister(false)}
                        disabled={loading}
                        className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" /> Fechar sem divergência
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setStep('difference')}
                        className="flex-1 py-4 bg-card border border-border hover:border-red-500 hover:text-red-500 text-foreground rounded-xl font-black shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" /> Fechar com diferença
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-background border border-red-500/30 rounded-2xl p-6 animate-slide-up">
                    <div className="flex items-center gap-3 mb-6 text-red-500">
                      <AlertTriangle className="w-6 h-6" />
                      <h4 className="text-lg font-black">Registrar Divergência</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                      <div>
                        <label className="text-sm font-bold text-gray-400 mb-2 block">
                          Valor contado
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Ex: 350.00"
                          value={countedTotal}
                          onChange={(e) => setCountedTotal(e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-400 mb-2 block">
                          Diferença em R$
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: -10.50 ou 5.00"
                          value={differenceValue}
                          onChange={(e) => setDifferenceValue(e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-400 mb-2 block">
                          Motivo / Observação
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: faltou troco"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setStep('initial')}
                        className="px-6 py-4 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold transition-all"
                      >
                        Voltar
                      </button>

                      <button
                        onClick={() => handleCloseRegister(true)}
                        disabled={loading}
                        className="flex-1 py-4 bg-primary text-black rounded-xl font-black shadow-lg hover:shadow-[0_0_20px_rgba(255,106,0,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Fechamento'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {openSession && sessionPaidOrders.length > 0 && (
            <div className="mb-12 animate-fade-in">
              <h3 className="font-black text-foreground mb-4 text-xl flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Auditoria do Caixa Aberto
                <span className="text-sm bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {sessionPaidOrders.length}
                </span>
              </h3>

              <div className="space-y-3">
                {sessionPaidOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-black text-muted-foreground text-sm">
                            #{String(order.number).padStart(4, '0')}
                          </span>

                          <span className="font-bold text-foreground">
                            {order.customerName}
                          </span>

                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {order.paidAt
                              ? new Date(order.paidAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '--:--'}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground italic mt-1">
                          {(order.items ?? [])
                            .map((i: any) => `${i.quantity}x ${i.productName}`)
                            .join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <span className="text-[10px] font-black uppercase text-gray-500">
                          {getPaymentMethodLabel(order.paymentMethod)}
                        </span>

                        <span className="font-black text-lg bg-[#111] px-3 py-1.5 rounded-lg border border-gray-800">
                          R$ {money(Number(order.total))}
                        </span>
                      </div>
                    </div>

                    {String(order.paymentMethod || '').toLowerCase() === 'dinheiro' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-background border border-border rounded-xl p-3">
                        <div>
                          <p className="text-[11px] uppercase font-black text-muted-foreground">
                            Valor da venda
                          </p>
                          <p className="font-black text-white">
                            R$ {money(Number(order.total || 0))}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase font-black text-muted-foreground">
                            Valor recebido
                          </p>
                          <p className="font-black text-green-500">
                            R$ {money(Number(order.amountReceived || 0))}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase font-black text-muted-foreground">
                            Troco
                          </p>
                          <p className="font-black text-orange-500">
                            R$ {money(Number(order.changeGiven || 0))}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-12 border-t border-border pt-8">
            <h3 className="font-black text-foreground text-xl">Histórico de Fechamentos</h3>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadCashPDF}
                disabled={dailyClosings.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border hover:border-primary hover:text-primary text-foreground rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </button>

              <div className="flex items-center gap-2 bg-[#111] border border-gray-800 rounded-xl px-4 py-2 shadow-sm focus-within:border-primary transition-colors cursor-pointer group hover:border-primary/50">
                <CalendarDays className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none [color-scheme:dark] cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {dailyClosings.length === 0 && (
              <p className="text-center py-10 text-muted-foreground bg-card rounded-2xl border border-dashed border-border font-medium shadow-sm">
                Nenhum fechamento registrado na data{' '}
                <span className="font-bold">
                  {new Date(`${historyDate}T12:00:00`).toLocaleDateString('pt-BR')}
                </span>.
              </p>
            )}

            {dailyClosings.map((closing) => {
              const rawDate = closing.closed_at || closing.created_at;
              const dateText = rawDate
                ? new Date(rawDate).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : 'Data Indisponível';

              return (
                <div
                  key={closing.id}
                  className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/50 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-black text-foreground text-lg">{dateText}</span>

                      {Number(closing.difference || 0) === 0 ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                          Exato
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                          Divergência
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Abertura: <span className="font-bold">{closing.opened_by || '-'}</span> | Fechamento:{' '}
                      <span className="font-bold">{closing.closed_by || '-'}</span>
                    </p>

                    {closing.notes && (
                      <p className="text-xs mt-1 italic text-muted-foreground/70 border-l-2 border-border pl-2">
                        {closing.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-6 bg-[#111] p-3 rounded-xl border border-gray-800 shadow-inner">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                        Sistema
                      </p>
                      <p className="font-bold text-foreground">
                        R$ {money(Number(closing.expected_total || 0))}
                      </p>
                    </div>

                    <div className="text-right border-l border-gray-800 pl-6">
                      <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">
                        Contado
                      </p>
                      <p
                        className={`font-black ${
                          Number(closing.difference || 0) < 0
                            ? 'text-red-500'
                            : Number(closing.difference || 0) > 0
                              ? 'text-green-500'
                              : 'text-primary'
                        }`}
                      >
                        R$ {money(Number(closing.counted_total || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-background border border-border p-4 rounded-2xl shadow-sm hover:border-primary/50 transition-colors">
      <div className={`flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider ${color}`}>
        {icon} {label}
      </div>
      <div className="text-2xl font-black text-foreground">
        R$ {money(Number(value || 0))}
      </div>
    </div>
  );
}