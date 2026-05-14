import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Loader2, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { onlyDigits } from '@/lib/whatsapp';

type Customer = {
  id: string;
  nome: string;
  telefone: string;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  referencia?: string | null;
  origem?: string | null;
  updated_at?: string | null;
};

const emptyForm = {
  nome: '',
  telefone: '',
  rua: '',
  numero: '',
  bairro: '',
  complemento: '',
  referencia: '',
};

export function CustomersPage() {
  const { lojaAtualId } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!lojaAtualId) return;

    setLoading(true);
    setCustomersLoaded(false);
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone, rua, numero, bairro, complemento, referencia, origem, updated_at')
      .eq('loja_id', lojaAtualId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('Erro ao buscar clientes.');
    } else {
      setCustomers(data ?? []);
    }

    setLoading(false);
    setCustomersLoaded(true);
  }, [lojaAtualId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (prefillApplied || loading || !customersLoaded) return;

    const params = new URLSearchParams(window.location.search);
    const phone = onlyDigits(params.get('editarTelefone') || params.get('telefone') || '');
    const name = params.get('nome') || '';

    if (!phone && !name) return;

    const existingCustomer = customers.find((customer) => customer.telefone === phone);

    if (existingCustomer) {
      setEditing(existingCustomer);
      setForm({
        nome: existingCustomer.nome || '',
        telefone: existingCustomer.telefone || '',
        rua: existingCustomer.rua || '',
        numero: existingCustomer.numero || '',
        bairro: existingCustomer.bairro || '',
        complemento: existingCustomer.complemento || '',
        referencia: existingCustomer.referencia || '',
      });
    } else {
      setEditing(null);
      setForm({
        ...emptyForm,
        nome: name,
        telefone: phone,
      });
    }

    setSearch(phone || name);
    setModalOpen(true);
    setPrefillApplied(true);
  }, [customers, customersLoaded, loading, prefillApplied]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = onlyDigits(search);

    if (!q && !digits) return customers;

    return customers.filter((customer) => {
      return (
        String(customer.nome || '').toLowerCase().includes(q) ||
        String(customer.telefone || '').includes(digits)
      );
    });
  }, [customers, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      nome: customer.nome || '',
      telefone: customer.telefone || '',
      rua: customer.rua || '',
      numero: customer.numero || '',
      bairro: customer.bairro || '',
      complemento: customer.complemento || '',
      referencia: customer.referencia || '',
    });
    setModalOpen(true);
  };

  const saveCustomer = async () => {
    if (!lojaAtualId) return toast.error('Loja não identificada.');

    const phone = onlyDigits(form.telefone) || onlyDigits(editing?.telefone || '');

    if (!form.nome.trim()) return toast.error('Informe o nome do cliente.');
    if (!/^\d{10,11}$/.test(phone)) return toast.error('Informe um telefone com DDD.');

    setSaving(true);

    const payload = {
      loja_id: lojaAtualId,
      nome: form.nome.trim(),
      telefone: phone,
      rua: form.rua.trim() || null,
      numero: form.numero.trim() || null,
      bairro: form.bairro.trim() || null,
      complemento: form.complemento.trim() || null,
      referencia: form.referencia.trim() || null,
      origem: editing ? editing.origem || 'manual' : 'manual',
      updated_at: new Date().toISOString(),
    };

    const query = editing
      ? supabase.from('clientes').update(payload).eq('loja_id', lojaAtualId).eq('id', editing.id)
      : supabase.from('clientes').upsert([payload], { onConflict: 'loja_id,telefone' });

    const { error } = await query;

    setSaving(false);

    if (error) {
      console.error(error);
      return toast.error('Não foi possível salvar o cliente.');
    }

    toast.success('Cliente salvo.');
    setModalOpen(false);
    await fetchCustomers();
  };

  const deleteCustomer = async (customer: Customer) => {
    if (!lojaAtualId) return;

    setDeleting(true);
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('loja_id', lojaAtualId)
      .eq('id', customer.id);

    if (error) {
      console.error(error);
      toast.error('Não foi possível excluir o cliente.');
      setDeleting(false);
      return;
    }

    toast.success('Cliente excluído.');
    setDeleting(false);
    setDeleteTarget(null);
    await fetchCustomers();
  };

  return (
    <>
      <div className="print:hidden">
        <AppHeader />
      </div>

      <div className="min-h-screen bg-background pt-24 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8 flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground shadow-sm transition-all hover:-translate-x-1 hover:border-primary hover:text-primary"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-primary">
                  Atendimento
                </p>
                <h2 className="flex items-center gap-3 text-3xl font-black text-foreground">
                  <UserRound className="h-8 w-8 text-primary" /> Clientes
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-black shadow-md transition-all hover:opacity-90"
            >
              <Plus className="h-5 w-5" /> Cadastrar cliente
            </button>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone"
                className="w-full rounded-xl border border-border bg-white px-12 py-3.5 font-medium text-black outline-none placeholder:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card py-12 text-center font-bold text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-foreground">{customer.nome}</p>
                      <p className="mt-1 text-sm font-bold text-primary">{customer.telefone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(customer)}
                        className="rounded-lg border border-border bg-background p-2 text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(customer)}
                        className="rounded-lg border border-border bg-background p-2 text-muted-foreground hover:border-red-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
                    {customer.rua || customer.numero || customer.bairro ? (
                      <p>
                        {[`${customer.rua || ''}${customer.numero ? `, ${customer.numero}` : ''}`, customer.bairro, customer.complemento, customer.referencia ? `Ref: ${customer.referencia}` : '']
                          .filter(Boolean)
                          .join(' - ')}
                      </p>
                    ) : (
                      <p>Sem endereço cadastrado.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-[#111] shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <h3 className="text-lg font-black text-foreground">
                {editing ? 'Editar cliente' : 'Cadastrar cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <CustomerInput label="Nome" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} />
              <CustomerInput label="Telefone / WhatsApp" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: onlyDigits(value) }))} maxLength={11} />
              <CustomerInput label="Rua" value={form.rua} onChange={(value) => setForm((prev) => ({ ...prev, rua: value }))} />
              <CustomerInput label="Número" value={form.numero} onChange={(value) => setForm((prev) => ({ ...prev, numero: value }))} />
              <CustomerInput label="Bairro" value={form.bairro} onChange={(value) => setForm((prev) => ({ ...prev, bairro: value }))} />
              <CustomerInput label="Complemento" value={form.complemento} onChange={(value) => setForm((prev) => ({ ...prev, complemento: value }))} />
              <div className="md:col-span-2">
                <CustomerInput label="Ponto de referência" value={form.referencia} onChange={(value) => setForm((prev) => ({ ...prev, referencia: value }))} />
              </div>
            </div>

            <div className="flex gap-3 border-t border-border bg-card p-5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-border bg-background px-5 py-3 font-bold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCustomer}
                disabled={saving}
                className="flex-1 rounded-xl bg-primary px-5 py-3 font-black text-black disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-red-500/20 bg-[#101010] text-white shadow-2xl">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black">Excluir cliente</h3>
              <p className="mt-2 text-sm text-gray-400">
                Tem certeza que deseja excluir <span className="font-bold text-white">{deleteTarget.nome}</span>?
              </p>
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left">
                <p className="text-xs font-bold text-red-300">
                  Esta ação remove o cadastro do cliente e não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deleteCustomer(deleteTarget)}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CustomerInput({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border/60 bg-white px-5 py-4 font-medium text-black outline-none placeholder:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );
}
