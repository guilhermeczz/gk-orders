import React, { useEffect, useMemo, useState } from 'react';
import {
  Store,
  Plus,
  Search,
  Power,
  Pencil,
  Building2,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';

type Loja = {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  cnpj: string | null;
  endereco: string | null;
  logo_url: string | null;
  plano: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};

type StoreFormData = {
  nome: string;
  slug: string;
  telefone: string;
  cnpj: string;
  endereco: string;
  plano: string;
  ativa: boolean;
  nomeImpressora: string;
  quantidadeMesas: string;
};

const emptyForm: StoreFormData = {
  nome: '',
  slug: '',
  telefone: '',
  cnpj: '',
  endereco: '',
  plano: 'teste',
  ativa: true,
  nomeImpressora: 'Cozinha',
  quantidadeMesas: '10',
};

function makeSlug(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .trim();
}

function formatDate(value?: string) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function DeveloperPanel() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [form, setForm] = useState<StoreFormData>(emptyForm);

  const fetchLojas = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lojas:', error);
      toast.error('Não foi possível carregar as lojas.');
      setLoading(false);
      return;
    }

    setLojas((data ?? []) as Loja[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLojas();
  }, []);

  const stats = useMemo(() => {
    const total = lojas.length;
    const ativas = lojas.filter((loja) => loja.ativa).length;
    const teste = lojas.filter((loja) => loja.plano === 'teste').length;
    const inativas = lojas.filter((loja) => !loja.ativa).length;

    return {
      total,
      ativas,
      teste,
      inativas,
    };
  }, [lojas]);

  const filteredLojas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return lojas;

    return lojas.filter((loja) => {
      return (
        loja.nome.toLowerCase().includes(q) ||
        loja.slug.toLowerCase().includes(q) ||
        String(loja.telefone || '').toLowerCase().includes(q) ||
        String(loja.cnpj || '').toLowerCase().includes(q) ||
        String(loja.plano || '').toLowerCase().includes(q)
      );
    });
  }, [lojas, searchTerm]);

  const openCreateModal = () => {
    setEditingLoja(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (loja: Loja) => {
    setEditingLoja(loja);
    setForm({
      nome: loja.nome || '',
      slug: loja.slug || '',
      telefone: loja.telefone || '',
      cnpj: loja.cnpj || '',
      endereco: loja.endereco || '',
      plano: loja.plano || 'teste',
      ativa: loja.ativa ?? true,
      nomeImpressora: 'Cozinha',
      quantidadeMesas: '0',
    });
    setModalOpen(true);
  };

  const handleChange = (field: keyof StoreFormData, value: string | boolean) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === 'nome' && !editingLoja) {
        next.slug = makeSlug(String(value));
      }

      if (field === 'slug') {
        next.slug = makeSlug(String(value));
      }

      return next;
    });
  };

  const createInitialMesas = async (lojaId: string, quantidade: number) => {
    if (!quantidade || quantidade <= 0) return;

    const rows = Array.from({ length: quantidade }, (_, index) => {
      const numero = index + 1;

      return {
        loja_id: lojaId,
        numero,
        nome: `Mesa ${numero}`,
        status: 'livre',
        ativa: true,
      };
    });

    const { error } = await supabase.from('mesas').insert(rows);

    if (error) {
      console.error('Erro ao criar mesas iniciais:', error);
      toast.warning('Loja criada, mas não foi possível criar as mesas iniciais.');
    }
  };

  const saveStore = async () => {
    const nome = form.nome.trim();
    const slug = makeSlug(form.slug || form.nome);

    if (!nome) {
      toast.error('Informe o nome da loja.');
      return;
    }

    if (!slug) {
      toast.error('Informe um slug válido.');
      return;
    }

    setSaving(true);

    try {
      if (editingLoja) {
        const { error } = await supabase
          .from('lojas')
          .update({
            nome,
            slug,
            telefone: form.telefone.trim() || null,
            cnpj: form.cnpj.trim() || null,
            endereco: form.endereco.trim() || null,
            plano: form.plano,
            ativa: form.ativa,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLoja.id);

        if (error) throw error;

        const { error: configError } = await supabase
          .from('configuracoes_loja')
          .upsert(
            {
              loja_id: editingLoja.id,
              nome_impressora: form.nomeImpressora.trim() || 'Cozinha',
              imprimir_automatico: true,
              largura_cupom_mm: 58,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'loja_id' }
          );

        if (configError) {
          console.error('Erro ao atualizar configurações:', configError);
        }

        toast.success('Loja atualizada com sucesso!');
      } else {
        const { data: novaLoja, error } = await supabase
          .from('lojas')
          .insert([
            {
              nome,
              slug,
              telefone: form.telefone.trim() || null,
              cnpj: form.cnpj.trim() || null,
              endereco: form.endereco.trim() || null,
              plano: form.plano,
              ativa: form.ativa,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        const lojaId = String(novaLoja.id);

        const { error: configError } = await supabase
          .from('configuracoes_loja')
          .insert([
            {
              loja_id: lojaId,
              nome_impressora: form.nomeImpressora.trim() || 'Cozinha',
              imprimir_automatico: true,
              largura_cupom_mm: 58,
            },
          ]);

        if (configError) {
          console.error('Erro ao criar configurações:', configError);
          toast.warning('Loja criada, mas a configuração inicial não foi criada.');
        }

        await createInitialMesas(lojaId, Number(form.quantidadeMesas || 0));

        toast.success('Loja criada com sucesso!');
      }

      setModalOpen(false);
      setEditingLoja(null);
      setForm(emptyForm);
      await fetchLojas();
    } catch (error: any) {
      console.error('Erro ao salvar loja:', error);

      if (String(error?.message || '').includes('duplicate key')) {
        toast.error('Já existe uma loja com esse slug.');
      } else {
        toast.error('Não foi possível salvar a loja.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStoreStatus = async (loja: Loja) => {
    const nextStatus = !loja.ativa;

    const { error } = await supabase
      .from('lojas')
      .update({
        ativa: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loja.id);

    if (error) {
      console.error('Erro ao alterar status da loja:', error);
      toast.error('Não foi possível alterar o status da loja.');
      return;
    }

    toast.success(nextStatus ? 'Loja ativada!' : 'Loja desativada!');
    await fetchLojas();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              GK Orders Developer
            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Painel do Desenvolvedor
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Gerencie lojas, planos, status e configurações iniciais do seu PDV multiloja.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" />
              Ir para operação
            </Link>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-black shadow-[0_0_25px_rgba(255,106,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(255,106,0,0.4)]"
            >
              <Plus className="h-4 w-4" />
              Nova loja
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total de lojas"
            value={String(stats.total)}
            icon={Building2}
            tone="primary"
          />
          <StatCard
            label="Lojas ativas"
            value={String(stats.ativas)}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Em teste"
            value={String(stats.teste)}
            icon={Wallet}
            tone="warning"
          />
          <StatCard
            label="Inativas"
            value={String(stats.inativas)}
            icon={XCircle}
            tone="danger"
          />
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl backdrop-blur-xl md:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">Lojas cadastradas</h2>
              <p className="mt-1 text-sm text-gray-400">
                Controle as unidades que usam o GK Orders.
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar loja, slug, plano..."
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-11 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Carregando lojas...
              </div>
            </div>
          ) : filteredLojas.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/30 p-10 text-center">
              <Store className="mx-auto mb-3 h-10 w-10 text-gray-500" />
              <p className="text-lg font-black">Nenhuma loja encontrada</p>
              <p className="mt-1 text-sm text-gray-400">
                Crie sua primeira loja para começar a configurar o GK Orders.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-black"
              >
                <Plus className="h-4 w-4" />
                Criar loja
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredLojas.map((loja) => (
                <div
                  key={loja.id}
                  className="group rounded-3xl border border-white/10 bg-black/35 p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:bg-black/50 hover:shadow-[0_0_35px_rgba(255,106,0,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            loja.ativa
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : 'border-red-500/30 bg-red-500/10 text-red-400'
                          }`}
                        >
                          {loja.ativa ? 'Ativa' : 'Inativa'}
                        </span>

                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                          {loja.plano}
                        </span>
                      </div>

                      <h3 className="truncate text-2xl font-black">{loja.nome}</h3>
                      <p className="mt-1 text-sm font-bold text-gray-400">
                        /{loja.slug}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(loja)}
                        className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2 text-blue-400 transition hover:bg-blue-500/20"
                        title="Editar loja"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStoreStatus(loja)}
                        className={`rounded-xl border p-2 transition ${
                          loja.ativa
                            ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                        title={loja.ativa ? 'Desativar loja' : 'Ativar loja'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoLine label="Telefone" value={loja.telefone || '-'} />
                    <InfoLine label="CNPJ" value={loja.cnpj || '-'} />
                    <InfoLine label="Criada em" value={formatDate(loja.created_at)} />
                    <InfoLine label="Atualizada em" value={formatDate(loja.updated_at)} />
                  </div>

                  {loja.endereco && (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                        Endereço
                      </p>
                      <p className="mt-1 text-sm text-gray-300">{loja.endereco}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#101010] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  {editingLoja ? 'Editar loja' : 'Nova loja'}
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  {editingLoja ? form.nome : 'Cadastrar unidade'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome da loja">
                  <input
                    value={form.nome}
                    onChange={(event) => handleChange('nome', event.target.value)}
                    placeholder="Ex: Burguer House"
                    className={inputClass}
                  />
                </Field>

                <Field label="Slug da loja">
                  <input
                    value={form.slug}
                    onChange={(event) => handleChange('slug', event.target.value)}
                    placeholder="burguer-house"
                    className={inputClass}
                  />
                </Field>

                <Field label="Telefone">
                  <input
                    value={form.telefone}
                    onChange={(event) => handleChange('telefone', event.target.value)}
                    placeholder="(19) 99999-9999"
                    className={inputClass}
                  />
                </Field>

                <Field label="CNPJ">
                  <input
                    value={form.cnpj}
                    onChange={(event) => handleChange('cnpj', event.target.value)}
                    placeholder="00.000.000/0001-00"
                    className={inputClass}
                  />
                </Field>

                <Field label="Plano">
                  <select
                    value={form.plano}
                    onChange={(event) => handleChange('plano', event.target.value)}
                    className={inputClass}
                  >
                    <option value="teste">Teste</option>
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </Field>

                <Field label="Nome da impressora">
                  <input
                    value={form.nomeImpressora}
                    onChange={(event) =>
                      handleChange('nomeImpressora', event.target.value)
                    }
                    placeholder="Cozinha"
                    className={inputClass}
                  />
                </Field>

                {!editingLoja && (
                  <Field label="Mesas iniciais">
                    <input
                      value={form.quantidadeMesas}
                      onChange={(event) =>
                        handleChange('quantidadeMesas', event.target.value)
                      }
                      type="number"
                      min="0"
                      placeholder="10"
                      className={inputClass}
                    />
                  </Field>
                )}

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleChange('ativa', !form.ativa)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      form.ativa
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-400'
                    }`}
                  >
                    <span>{form.ativa ? 'Loja ativa' : 'Loja inativa'}</span>
                    <Power className="h-4 w-4" />
                  </button>
                </div>

                <div className="md:col-span-2">
                  <Field label="Endereço">
                    <textarea
                      value={form.endereco}
                      onChange={(event) =>
                        handleChange('endereco', event.target.value)
                      }
                      placeholder="Rua, número, bairro, cidade..."
                      className={`${inputClass} min-h-[90px] resize-none`}
                    />
                  </Field>
                </div>
              </div>

              {!editingLoja && (
                <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <div className="flex gap-3">
                    <LayoutGrid className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-black text-primary">
                        Criação automática de mesas
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-300">
                        Ao criar a loja, o sistema pode gerar automaticamente as mesas
                        iniciais. Depois você poderá editar ou adicionar novas mesas no
                        painel operacional da loja.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex gap-3">
                  <Settings className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-sm font-black">Configuração inicial</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      A loja será criada com impressão automática habilitada,
                      cupom 58mm e configuração padrão de cozinha.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveStore}
                disabled={saving}
                className="flex-1 rounded-2xl bg-primary py-4 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </span>
                ) : editingLoja ? (
                  'Salvar alterações'
                ) : (
                  'Criar loja'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-primary bg-primary/10 border-primary/20'
      : tone === 'success'
        ? 'text-green-400 bg-green-500/10 border-green-500/20'
        : tone === 'warning'
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          : 'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-2xl border p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-gray-200">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-primary/60 focus:ring-4 focus:ring-primary/10';