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
  MapPin,
  Phone,
  FileText,
  Calendar,
  Users,
  UserPlus,
  KeyRound,
  UserRound,
  BadgeCheck,
} from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/lib/supabase';
import { setCurrentStoreId } from '@/lib/current-store';
import { useAuth } from '@/lib/auth';

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

type LojaUsuario = {
  id: string;
  nome: string;
  username: string;
  loja_id: string | null;
  perfil: string;
  ativo: boolean;
};

type UserFormData = {
  nome: string;
  username: string;
  senha: string;
  perfil: string;
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

const emptyUserForm: UserFormData = {
  nome: '',
  username: '',
  senha: '',
  perfil: 'operador',
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

function normalizeUsername(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
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

function perfilLabel(perfil: string) {
  const labels: Record<string, string> = {
    admin_loja: 'Admin da loja',
    operador: 'Operador',
    caixa: 'Caixa',
    cozinha: 'Cozinha',
    desenvolvedor: 'Desenvolvedor',
  };

  return labels[perfil] || perfil;
}

export function DeveloperPanel() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [form, setForm] = useState<StoreFormData>(emptyForm);

  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [selectedLojaUsers, setSelectedLojaUsers] = useState<Loja | null>(null);
  const [lojaUsers, setLojaUsers] = useState<LojaUsuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState<UserFormData>(emptyUserForm);

  const fetchLojas = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar lojas:', error);
        toast.error('Não foi possível carregar as lojas.');
        return;
      }

      setLojas((data ?? []) as Loja[]);
    } finally {
      setLoading(false);
    }
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

  const fetchLojaUsers = async (lojaId: string) => {
    setLoadingUsers(true);

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, username, loja_id, perfil, ativo')
        .eq('loja_id', lojaId)
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar usuários da loja:', error);
        toast.error('Não foi possível carregar os usuários da loja.');
        setLojaUsers([]);
        return;
      }

      setLojaUsers(
        (data ?? []).map((usuario: any) => ({
          id: String(usuario.id),
          nome: usuario.nome,
          username: usuario.username,
          loja_id: usuario.loja_id ? String(usuario.loja_id) : null,
          perfil: usuario.perfil || 'operador',
          ativo: usuario.ativo ?? true,
        }))
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const openUsersModal = async (loja: Loja) => {
    setSelectedLojaUsers(loja);
    setUserForm(emptyUserForm);
    setUsersModalOpen(true);
    await fetchLojaUsers(loja.id);
  };

  const accessStore = (loja: Loja) => {
    if (!loja.ativa) {
      toast.error('Essa loja está inativa. Ative a loja antes de acessar.');
      return;
    }

    setCurrentStoreId(loja.id);
    toast.success(`Acessando ${loja.nome}...`);

    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 300);
  };

  const openCreateModal = () => {
    setEditingLoja(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (loja: Loja) => {
    setEditingLoja(loja);

    let nomeImpressora = 'Cozinha';

    const { data: config, error } = await supabase
      .from('configuracoes_loja')
      .select('nome_impressora')
      .eq('loja_id', loja.id)
      .maybeSingle();

    if (!error && config?.nome_impressora) {
      nomeImpressora = config.nome_impressora;
    }

    setForm({
      nome: loja.nome || '',
      slug: loja.slug || '',
      telefone: loja.telefone || '',
      cnpj: loja.cnpj || '',
      endereco: loja.endereco || '',
      plano: loja.plano || 'teste',
      ativa: loja.ativa ?? true,
      nomeImpressora,
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

  const handleUserChange = (field: keyof UserFormData, value: string) => {
    setUserForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === 'username') {
        next.username = normalizeUsername(value);
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
          toast.warning('Loja atualizada, mas não foi possível atualizar a configuração.');
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

  const createStoreUser = async () => {
    if (!selectedLojaUsers) return;

    const lojaIdAtual = selectedLojaUsers.id;
    const nome = userForm.nome.trim();
    const username = normalizeUsername(userForm.username);
    const senha = userForm.senha.trim();
    const perfil = userForm.perfil;

    if (!nome || !username || !senha) {
      toast.error('Preencha nome, usuário e senha.');
      return;
    }

    if (senha.length < 6) {
      toast.error('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    const alreadyExists = lojaUsers.some(
      (usuario) => normalizeUsername(usuario.username) === username
    );

    if (alreadyExists) {
      toast.error('Já existe um usuário com esse nome nesta loja.');
      return;
    }

    setSavingUser(true);

    try {
      const ok = await register(nome, username, senha, {
        lojaId: lojaIdAtual,
        perfil,
      });

      if (!ok) return;

      setUserForm(emptyUserForm);
      await fetchLojaUsers(lojaIdAtual);

      navigate({
        to: '/developer',
        replace: true,
      });
    } catch (error) {
      console.error('Erro ao criar usuário da loja:', error);
      toast.error('Não foi possível criar o usuário.');
    } finally {
      setSavingUser(false);
    }
  };

  const toggleStoreUserStatus = async (usuario: LojaUsuario) => {
    if (!selectedLojaUsers) return;

    const nextStatus = !usuario.ativo;

    const { error: userError } = await supabase
      .from('usuarios')
      .update({
        ativo: nextStatus,
      })
      .eq('id', usuario.id)
      .eq('loja_id', selectedLojaUsers.id);

    if (userError) {
      console.error('Erro ao alterar usuário:', userError);
      toast.error('Não foi possível alterar o status do usuário.');
      return;
    }

    const { error: vinculoError } = await supabase
      .from('usuario_lojas')
      .update({
        ativo: nextStatus,
      })
      .eq('usuario_id', usuario.id)
      .eq('loja_id', selectedLojaUsers.id);

    if (vinculoError) {
      console.error('Erro ao alterar vínculo usuario_lojas:', vinculoError);
    }

    toast.success(nextStatus ? 'Usuário ativado!' : 'Usuário desativado!');
    await fetchLojaUsers(selectedLojaUsers.id);
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
    <div className="print:hidden">
      <AppHeader />
    </div>

    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />
    </div>

    <header className="relative z-10 mt-14 border-b border-white/10 bg-black/50 backdrop-blur-xl">
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
            Gerencie lojas, planos, usuários e configurações iniciais do seu PDV multiloja.
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

      <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between md:p-5">
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
            <div className="m-5 rounded-3xl border border-dashed border-white/10 bg-black/30 p-10 text-center">
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
            <div className="divide-y divide-white/10">
              {filteredLojas.map((loja) => (
                <div
                  key={loja.id}
                  className="grid grid-cols-1 gap-4 bg-black/20 p-4 transition hover:bg-white/[0.04] md:grid-cols-[1.2fr_1fr_auto] md:items-center md:p-5"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <Store className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
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

                      <h3 className="truncate text-xl font-black">{loja.nome}</h3>
                      <p className="mt-1 truncate text-sm font-bold text-gray-400">
                        /{loja.slug}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2">
                    <MiniInfo icon={Phone} label="Telefone" value={loja.telefone || '-'} />
                    <MiniInfo icon={FileText} label="CNPJ" value={loja.cnpj || '-'} />
                    <MiniInfo icon={Calendar} label="Criada em" value={formatDate(loja.created_at)} />
                    <MiniInfo icon={MapPin} label="Endereço" value={loja.endereco || '-'} />
                  </div>

                  <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => accessStore(loja)}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary transition hover:bg-primary/20"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Acessar
                    </button>

                    <button
                      type="button"
                      onClick={() => openUsersModal(loja)}
                      className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-300 transition hover:bg-purple-500/20"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Usuários
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(loja)}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-400 transition hover:bg-blue-500/20"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleStoreStatus(loja)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                        loja.ativa
                          ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {loja.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <StoreModal
          editingLoja={editingLoja}
          form={form}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onChange={handleChange}
          onSave={saveStore}
        />
      )}

      {usersModalOpen && selectedLojaUsers && (
        <UsersModal
          loja={selectedLojaUsers}
          users={lojaUsers}
          loadingUsers={loadingUsers}
          savingUser={savingUser}
          userForm={userForm}
          onClose={() => {
            setUsersModalOpen(false);
            setSelectedLojaUsers(null);
            setLojaUsers([]);
            setUserForm(emptyUserForm);
          }}
          onChange={handleUserChange}
          onCreateUser={createStoreUser}
          onToggleUser={toggleStoreUserStatus}
        />
      )}
    </div>
  );
}

function StoreModal({
  editingLoja,
  form,
  saving,
  onClose,
  onChange,
  onSave,
}: {
  editingLoja: Loja | null;
  form: StoreFormData;
  saving: boolean;
  onClose: () => void;
  onChange: (field: keyof StoreFormData, value: string | boolean) => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#101010] text-white shadow-2xl">
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
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <p className="font-black">Dados principais da loja</p>
                <p className="text-xs text-gray-400">
                  Informações usadas para identificar e organizar a unidade.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome da loja">
                <input
                  value={form.nome}
                  onChange={(event) => onChange('nome', event.target.value)}
                  placeholder="Ex: Burguer House"
                  className={inputClass}
                />
              </Field>

              <Field label="Slug da loja">
                <input
                  value={form.slug}
                  onChange={(event) => onChange('slug', event.target.value)}
                  placeholder="burguer-house"
                  className={inputClass}
                />
              </Field>

              <Field label="Telefone">
                <input
                  value={form.telefone}
                  onChange={(event) => onChange('telefone', event.target.value)}
                  placeholder="(19) 99999-9999"
                  className={inputClass}
                />
              </Field>

              <Field label="CNPJ">
                <input
                  value={form.cnpj}
                  onChange={(event) => onChange('cnpj', event.target.value)}
                  placeholder="00.000.000/0001-00"
                  className={inputClass}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Endereço">
                  <textarea
                    value={form.endereco}
                    onChange={(event) => onChange('endereco', event.target.value)}
                    placeholder="Rua, número, bairro, cidade..."
                    className={`${inputClass} min-h-[90px] resize-none`}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  <Settings className="h-6 w-6" />
                </div>

                <div>
                  <p className="font-black">Configurações</p>
                  <p className="text-xs text-gray-400">
                    Plano, status e impressão.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Plano">
                  <select
                    value={form.plano}
                    onChange={(event) => onChange('plano', event.target.value)}
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
                    onChange={(event) => onChange('nomeImpressora', event.target.value)}
                    placeholder="Cozinha"
                    className={inputClass}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => onChange('ativa', !form.ativa)}
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
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                  <LayoutGrid className="h-6 w-6" />
                </div>

                <div>
                  <p className="font-black">Mesas iniciais</p>
                  <p className="text-xs text-gray-400">
                    Geradas automaticamente na criação.
                  </p>
                </div>
              </div>

              {!editingLoja ? (
                <Field label="Quantidade de mesas">
                  <input
                    value={form.quantidadeMesas}
                    onChange={(event) => onChange('quantidadeMesas', event.target.value)}
                    type="number"
                    min="0"
                    placeholder="10"
                    className={inputClass}
                  />
                </Field>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                  A quantidade de mesas iniciais só pode ser definida na criação da loja.
                  Depois, edite as mesas dentro da operação da unidade.
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm font-black text-primary">
                  Configuração inicial
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-300">
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
            onClick={onClose}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
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
  );
}

function UsersModal({
  loja,
  users,
  loadingUsers,
  savingUser,
  userForm,
  onClose,
  onChange,
  onCreateUser,
  onToggleUser,
}: {
  loja: Loja;
  users: LojaUsuario[];
  loadingUsers: boolean;
  savingUser: boolean;
  userForm: UserFormData;
  onClose: () => void;
  onChange: (field: keyof UserFormData, value: string) => void;
  onCreateUser: () => void;
  onToggleUser: (usuario: LojaUsuario) => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#101010] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
              Usuários da loja
            </p>
            <h3 className="mt-1 text-2xl font-black">{loja.nome}</h3>
            <p className="mt-1 text-sm text-gray-400">/{loja.slug}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[68vh] grid-cols-1 overflow-y-auto lg:grid-cols-[380px_1fr]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                  <UserPlus className="h-6 w-6" />
                </div>

                <div>
                  <p className="font-black">Novo usuário</p>
                  <p className="text-xs text-gray-400">
                    Crie o acesso do operador desta loja.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Nome">
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={userForm.nome}
                      onChange={(event) => onChange('nome', event.target.value)}
                      placeholder="Ex: João Silva"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </Field>

                <Field label="Usuário">
                  <div className="relative">
                    <BadgeCheck className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={userForm.username}
                      onChange={(event) => onChange('username', event.target.value)}
                      placeholder="Ex: joao"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </Field>

                <Field label="Senha">
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={userForm.senha}
                      onChange={(event) => onChange('senha', event.target.value)}
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </Field>

                <Field label="Perfil">
                  <select
                    value={userForm.perfil}
                    onChange={(event) => onChange('perfil', event.target.value)}
                    className={inputClass}
                  >
                    <option value="admin_loja">Admin da loja</option>
                    <option value="operador">Operador</option>
                    <option value="caixa">Caixa</option>
                    <option value="cozinha">Cozinha</option>
                  </select>
                </Field>

                <button
                  type="button"
                  onClick={onCreateUser}
                  disabled={savingUser}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {savingUser ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Criar usuário
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-black">Usuários cadastrados</h4>
                <p className="text-sm text-gray-400">
                  Controle quem pode acessar esta loja.
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-gray-300">
                {users.length} usuário(s)
              </span>
            </div>

            {loadingUsers ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-black/25">
                <div className="flex items-center gap-3 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Carregando usuários...
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-gray-500" />
                <p className="text-lg font-black">Nenhum usuário nesta loja</p>
                <p className="mt-1 text-sm text-gray-400">
                  Crie o primeiro operador usando o formulário ao lado.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/25">
                <div className="divide-y divide-white/10">
                  {users.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="flex flex-col gap-3 p-4 transition hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              usuario.ativo
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : 'border-red-500/30 bg-red-500/10 text-red-400'
                            }`}
                          >
                            {usuario.ativo ? 'Ativo' : 'Inativo'}
                          </span>

                          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-purple-300">
                            {perfilLabel(usuario.perfil)}
                          </span>
                        </div>

                        <p className="truncate text-base font-black text-white">
                          {usuario.nome}
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-gray-400">
                          @{usuario.username}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleUser(usuario)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                          usuario.ativo
                            ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {usuario.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-black text-primary">Como o acesso funciona</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-300">
                O usuário criado aqui entra pela tela de login usando o campo usuário e senha.
                Depois do login, o sistema abre automaticamente a loja vinculada a ele.
              </p>
            </div>
          </div>
        </div>
      </div>
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

function MiniInfo({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="truncate text-xs font-bold text-gray-300">{value}</p>
      </div>
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