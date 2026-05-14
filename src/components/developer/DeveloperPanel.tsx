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
  Trash2,
  UploadCloud,
  AlertTriangle,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
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
  logo_url: string;
  plano: string;
  ativa: boolean;
  nomeImpressora: string;
  quantidadeMesas: string;
  tema: string;
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
  logo_url: '',
  plano: 'teste',
  ativa: true,
  nomeImpressora: 'Cozinha',
  quantidadeMesas: '10',
  tema: 'laranja',
};

const emptyUserForm: UserFormData = {
  nome: '',
  username: '',
  senha: '',
  perfil: 'operador',
};

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_INITIAL_TABLES = 200;
const VALID_USER_PROFILES = new Set(['admin_loja', 'operador']);

const STORE_DELETE_TABLES: Array<{ table: string; label: string }> = [
  { table: 'print_jobs', label: 'fila de impressao' },
  { table: 'cash_withdrawals', label: 'sangrias' },
  { table: 'cash_sessions', label: 'caixas' },
  { table: 'pedido_itens', label: 'itens dos pedidos' },
  { table: 'pedidos', label: 'pedidos' },
  { table: 'clientes', label: 'clientes' },
  { table: 'mesas', label: 'mesas' },
  { table: 'produtos', label: 'produtos' },
  { table: 'categorias', label: 'categorias' },
  { table: 'configuracoes_loja', label: 'configuracoes da loja' },
  { table: 'usuario_lojas', label: 'vinculos de usuarios' },
];

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
    desenvolvedor: 'Desenvolvedor',
  };
  return labels[perfil] || perfil;
}

export function DeveloperPanel() {
  const { register } = useAuth();

  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [form, setForm] = useState<StoreFormData>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [selectedLojaUsers, setSelectedLojaUsers] = useState<Loja | null>(null);
  const [lojaUsers, setLojaUsers] = useState<LojaUsuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState<UserFormData>(emptyUserForm);
  const [editingUser, setEditingUser] = useState<LojaUsuario | null>(null);
  const [deletingUser, setDeletingUser] = useState<LojaUsuario | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [deleteStoreModalOpen, setDeleteStoreModalOpen] = useState(false);
  const [deletingLoja, setDeletingLoja] = useState<Loja | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accessLojaTarget, setAccessLojaTarget] = useState<Loja | null>(null);
  const [quickActionKey, setQuickActionKey] = useState<string | null>(null);

  const fetchLojas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
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
    return {
      total: lojas.length,
      ativas: lojas.filter((l) => l.ativa).length,
      teste: lojas.filter((l) => l.plano === 'teste').length,
      inativas: lojas.filter((l) => !l.ativa).length,
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
    setEditingUser(null);
    setUsersModalOpen(true);
    await fetchLojaUsers(loja.id);
  };

  const requestAccessStore = (loja: Loja) => {
    if (!loja.ativa) {
      toast.error('Essa loja está inativa. Ative a loja antes de acessar.');
      return;
    }
    setAccessLojaTarget(loja);
  };

  const confirmAccessStore = () => {
    if (!accessLojaTarget) return;

    const loja = accessLojaTarget;
    setCurrentStoreId(loja.id);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gk_orders_developer_access_store_name', loja.nome);
      sessionStorage.setItem('gk_orders_developer_access_store_slug', loja.slug);
    }
    toast.success(`Acessando ${loja.nome}...`);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 300);
  };

  const openCreateModal = () => {
    setEditingLoja(null);
    setForm(emptyForm);
    setLogoFile(null);
    setModalOpen(true);
  };

  const openEditModal = async (loja: Loja) => {
    setEditingLoja(loja);
    setLogoFile(null);

    let nomeImpressora = 'Cozinha';
    let tema = 'laranja';

    const { data: config, error } = await supabase
      .from('configuracoes_loja')
      .select('nome_impressora, tema')
      .eq('loja_id', loja.id)
      .maybeSingle();

    if (!error && config) {
      if (config.nome_impressora) nomeImpressora = config.nome_impressora;
      if (config.tema) tema = config.tema;
    }

    setForm({
      nome: loja.nome || '',
      slug: loja.slug || '',
      telefone: loja.telefone || '',
      cnpj: loja.cnpj || '',
      endereco: loja.endereco || '',
      logo_url: loja.logo_url || '',
      plano: loja.plano || 'teste',
      ativa: loja.ativa ?? true,
      nomeImpressora,
      quantidadeMesas: '0',
      tema,
    });

    setModalOpen(true);
  };

  // NOVA FUNÇÃO: Prepara a exclusão da loja
  const confirmDeleteStore = (loja: Loja) => {
    setDeletingLoja(loja);
    setDeleteStoreModalOpen(true);
  };

  // NOVA FUNÇÃO: Executa a exclusão da loja
  const deleteStoreLogoFile = async (logoUrl?: string | null) => {
    if (!logoUrl) return;

    const marker = '/storage/v1/object/public/logos/';
    const markerIndex = logoUrl.indexOf(marker);
    if (markerIndex === -1) return;

    const path = decodeURIComponent(logoUrl.slice(markerIndex + marker.length).split('?')[0]);
    if (!path) return;

    const { error } = await supabase.storage.from('logos').remove([path]);
    if (error) {
      console.warn('Nao foi possivel remover logo da loja:', error);
    }
  };

  const deleteRowsByStore = async (table: string, label: string, lojaId: string) => {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('loja_id', lojaId);

    if (error) {
      throw new Error(`Erro ao excluir ${label}: ${error.message}`);
    }
  };

  const handleDeleteStore = async () => {
    if (!deletingLoja) return;

    setIsDeleting(true);
    try {
      // Deleta a loja. Se você tiver as chaves estrangeiras com "ON DELETE CASCADE", 
      // o Supabase cuidará de deletar os produtos, pedidos, etc, associados.
      const lojaId = deletingLoja.id;

      const { data: storeUsers, error: usersError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('loja_id', lojaId);

      if (usersError) throw usersError;

      const { data: linkedUsers, error: linkedUsersError } = await supabase
        .from('usuario_lojas')
        .select('usuario_id')
        .eq('loja_id', lojaId);

      if (linkedUsersError) throw linkedUsersError;

      const userIdsToDelete = Array.from(
        new Set([
          ...(storeUsers ?? []).map((usuario: any) => String(usuario.id)),
          ...(linkedUsers ?? []).map((vinculo: any) => String(vinculo.usuario_id)),
        ].filter(Boolean))
      );

      for (const item of STORE_DELETE_TABLES) {
        await deleteRowsByStore(item.table, item.label, lojaId);
      }

      for (const userId of userIdsToDelete) {
        const { data, error } = await supabase.functions.invoke('delete-operator', {
          body: { userId },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || 'Erro ao excluir usuario da loja.');
        }
      }

      const { error: usersDeleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('loja_id', lojaId);

      if (usersDeleteError) throw usersDeleteError;

      await deleteStoreLogoFile(deletingLoja.logo_url);

      const { error: lojaError } = await supabase
        .from('lojas')
        .delete()
        .eq('id', lojaId);

      if (lojaError) {
        throw lojaError;
      }

      toast.success('Loja excluída com sucesso!');
      setDeleteStoreModalOpen(false);
      setDeletingLoja(null);
      await fetchLojas();
    } catch (error: any) {
      console.error('Erro ao deletar loja:', error);
      // Alguns bancos travam a exclusão se houver usuários/produtos amarrados sem cascade
      if (error.code === '23503') {
        toast.error('Não é possível excluir a loja pois ela possui registros vinculados (usuários, produtos, etc).');
      } else {
        toast.error(error.message || 'Ocorreu um erro ao excluir a loja.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (field: keyof StoreFormData, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'nome' && !editingLoja) next.slug = makeSlug(String(value));
      if (field === 'slug') next.slug = makeSlug(String(value));
      return next;
    });
  };

  const handleUserChange = (field: keyof UserFormData, value: string) => {
    setUserForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'username') next.username = normalizeUsername(value);
      return next;
    });
  };

  const createInitialMesas = async (lojaId: string, quantidade: number) => {
    if (!quantidade || quantidade <= 0) return;
    const rows = Array.from({ length: quantidade }, (_, index) => {
      const numero = index + 1;
      return { loja_id: lojaId, numero, nome: `Mesa ${numero}`, status: 'livre', ativa: true };
    });
    const { error } = await supabase.from('mesas').insert(rows);
    if (error) toast.warning('Loja criada, mas não foi possível criar as mesas iniciais.');
  };

  const saveStore = async () => {
    const nome = form.nome.trim();
    const slug = makeSlug(form.slug || form.nome);
    const quantidadeMesas = Number(form.quantidadeMesas || 0);

    if (!nome) return toast.error('Informe o nome da loja.');
    if (!slug) return toast.error('Informe um slug válido.');
    if (slug.length < 3) return toast.error('O slug precisa ter pelo menos 3 caracteres.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return toast.error('Use apenas letras, números e hífen no slug.');
    if (!Number.isInteger(quantidadeMesas) || quantidadeMesas < 0 || quantidadeMesas > MAX_INITIAL_TABLES) {
      return toast.error(`Informe uma quantidade de mesas entre 0 e ${MAX_INITIAL_TABLES}.`);
    }
    if (logoFile && !logoFile.type.startsWith('image/')) {
      return toast.error('Envie um arquivo de imagem válido para a logo.');
    }
    if (logoFile && logoFile.size > MAX_LOGO_SIZE_BYTES) {
      return toast.error('A logo deve ter no máximo 2 MB.');
    }

    setSaving(true);

    try {
      const { data: slugOwner, error: slugError } = await supabase
        .from('lojas')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (slugError) throw slugError;
      if (slugOwner && (!editingLoja || String(slugOwner.id) !== String(editingLoja.id))) {
        toast.error('Já existe uma loja com esse slug.');
        return;
      }

      let finalLogoUrl = form.logo_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${slug}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw new Error('Erro ao fazer upload da logo: ' + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
        finalLogoUrl = publicUrlData.publicUrl;
      }

      if (editingLoja) {
        const { error } = await supabase
          .from('lojas')
          .update({
            nome,
            slug,
            telefone: form.telefone.trim() || null,
            cnpj: form.cnpj.trim() || null,
            endereco: form.endereco.trim() || null,
            logo_url: finalLogoUrl || null,
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
              tema: form.tema,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'loja_id' }
          );

        if (configError) toast.warning('Loja atualizada, mas não foi possível atualizar a configuração.');
        else toast.success('Loja atualizada com sucesso!');
      } else {
        const { data: novaLoja, error } = await supabase
          .from('lojas')
          .insert([{
              nome,
              slug,
              telefone: form.telefone.trim() || null,
              cnpj: form.cnpj.trim() || null,
              endereco: form.endereco.trim() || null,
              logo_url: finalLogoUrl || null,
              plano: form.plano,
              ativa: form.ativa,
          }])
          .select()
          .single();

        if (error) throw error;

        const lojaId = String(novaLoja.id);

        const { error: configError } = await supabase
          .from('configuracoes_loja')
          .insert([{
              loja_id: lojaId,
              nome_impressora: form.nomeImpressora.trim() || 'Cozinha',
              imprimir_automatico: true,
              largura_cupom_mm: 58,
              tema: form.tema,
          }]);

        if (configError) toast.warning('Loja criada, mas a configuração inicial não foi criada.');
        await createInitialMesas(lojaId, quantidadeMesas);
        toast.success('Loja criada com sucesso!');
      }

      setModalOpen(false);
      setEditingLoja(null);
      setForm(emptyForm);
      setLogoFile(null);
      await fetchLojas();
    } catch (error: any) {
      if (String(error?.message || '').includes('duplicate key')) toast.error('Já existe uma loja com esse slug.');
      else toast.error(error.message || 'Não foi possível salvar a loja.');
    } finally {
      setSaving(false);
    }
  };

  const editStoreUser = (usuario: LojaUsuario) => {
    setEditingUser(usuario);
    setUserForm({ nome: usuario.nome, username: usuario.username, senha: '', perfil: usuario.perfil });
  };

  const saveStoreUser = async () => {
    if (!selectedLojaUsers) return;
    const { id: lojaIdAtual } = selectedLojaUsers;
    const nome = userForm.nome.trim();
    const username = normalizeUsername(userForm.username);
    const senha = userForm.senha.trim();
    const perfil = userForm.perfil;

    if (!nome || !username) return toast.error('Preencha nome e usuário.');
    if (nome.length < 3) return toast.error('O nome precisa ter pelo menos 3 caracteres.');
    if (username.length < 3) return toast.error('O usuário precisa ter pelo menos 3 caracteres.');
    if (!VALID_USER_PROFILES.has(perfil)) return toast.error('Perfil de usuário inválido.');

    setSavingUser(true);
    try {
      const { data: usernameOwner, error: usernameError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('loja_id', lojaIdAtual)
        .eq('username', username)
        .maybeSingle();

      if (usernameError) throw usernameError;
      if (usernameOwner && (!editingUser || String(usernameOwner.id) !== String(editingUser.id))) {
        toast.error('Usuário já existe nesta loja.');
        return;
      }

      if (editingUser) {
        const duplicatedUser = lojaUsers.some(
          (u) =>
            String(u.id) !== String(editingUser.id) &&
            normalizeUsername(u.username) === username
        );
        if (duplicatedUser) {
          toast.error('Usuário já existe nesta loja.');
          return;
        }

        const { error } = await supabase.from('usuarios').update({ nome, username, perfil }).eq('id', editingUser.id);
        if (error) throw error;
        if (senha) {
          if (senha.length < 6) { toast.error('Nova senha mín. 6 chars.'); setSavingUser(false); return; }
          toast.warning('Perfil atualizado. Senha requer backend.');
        } else toast.success('Usuário atualizado!');
      } else {
        if (!senha || senha.length < 6) { toast.error('Senha mín. 6 chars.'); setSavingUser(false); return; }
        if (lojaUsers.some((u) => normalizeUsername(u.username) === username)) {
          toast.error('Usuário já existe nesta loja.'); setSavingUser(false); return;
        }
        const ok = await register(nome, username, senha, { lojaId: lojaIdAtual, perfil });
        if (!ok) throw new Error('Falha no registro.');
        toast.success('Usuário criado!');
      }
      setUserForm(emptyUserForm);
      setEditingUser(null);
      await fetchLojaUsers(lojaIdAtual);
    } catch (error) { toast.error('Erro ao salvar usuário.'); } 
    finally { setSavingUser(false); }
  };

  const deleteStoreUser = (usuario: LojaUsuario) => {
    setDeletingUser(usuario);
  };

  const confirmDeleteStoreUser = async () => {
    if (!deletingUser) return;
    try {
      setIsDeletingUser(true);
      const { data, error } = await supabase.functions.invoke('delete-operator', { body: { userId: deletingUser.id } });
      if (error || data?.error) {
        toast.error('Erro ao excluir usuário.');
        setIsDeletingUser(false);
        return;
      }
      toast.success('Usuário excluído!');
      if (selectedLojaUsers) await fetchLojaUsers(selectedLojaUsers.id);
      setIsDeletingUser(false);
      setDeletingUser(null);
    } catch (error) { toast.error('Erro ao excluir usuário.'); }
  };


  const toggleStoreUserStatus = async (usuario: LojaUsuario) => {
    if (!selectedLojaUsers) return;
    const nextStatus = !usuario.ativo;
    const lojaId = selectedLojaUsers.id;
    const actionKey = `user-status-${usuario.id}`;

    try {
      setQuickActionKey(actionKey);
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .update({ ativo: nextStatus })
        .eq('id', usuario.id)
        .eq('loja_id', lojaId);

      if (usuarioError) throw usuarioError;

      const { error: vinculoError } = await supabase
        .from('usuario_lojas')
        .update({ ativo: nextStatus })
        .eq('usuario_id', usuario.id)
        .eq('loja_id', lojaId);

      if (vinculoError) {
        await supabase
          .from('usuarios')
          .update({ ativo: usuario.ativo })
          .eq('id', usuario.id)
          .eq('loja_id', lojaId);
        throw vinculoError;
      }

      toast.success(nextStatus ? 'Usuário ativado!' : 'Usuário desativado!');
      await fetchLojaUsers(lojaId);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error('Não foi possível alterar o status do usuário.');
      await fetchLojaUsers(lojaId);
    } finally {
      setQuickActionKey(null);
    }
  };

  const toggleStoreStatus = async (loja: Loja) => {
    const nextStatus = !loja.ativa;
    const actionKey = `store-status-${loja.id}`;
    try {
      setQuickActionKey(actionKey);
      const { error } = await supabase
        .from('lojas')
        .update({ ativa: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', loja.id);

      if (error) throw error;

      setLojas((prev) =>
        prev.map((item) =>
          String(item.id) === String(loja.id)
            ? { ...item, ativa: nextStatus, updated_at: new Date().toISOString() }
            : item
        )
      );
      toast.success(nextStatus ? 'Loja ativada!' : 'Loja desativada!');
    } catch (error) {
      console.error('Erro ao alterar status da loja:', error);
      toast.error('Não foi possível alterar o status da loja.');
      await fetchLojas();
    } finally {
      setQuickActionKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="print:hidden"><AppHeader /></div>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <header className="relative z-10 mt-14 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-4 w-4" /> GK Orders Developer
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Painel do Desenvolvedor</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">Gerencie lojas, planos, usuários e configurações.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
              <ExternalLink className="h-4 w-4" /> Ir para operação
            </Link>
            <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-black shadow-[0_0_25px_rgba(255,106,0,0.25)] hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(255,106,0,0.4)]">
              <Plus className="h-4 w-4" /> Nova loja
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total de lojas" value={String(stats.total)} icon={Building2} tone="primary" />
          <StatCard label="Lojas ativas" value={String(stats.ativas)} icon={CheckCircle2} tone="success" />
          <StatCard label="Em teste" value={String(stats.teste)} icon={Wallet} tone="warning" />
          <StatCard label="Inativas" value={String(stats.inativas)} icon={XCircle} tone="danger" />
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <h2 className="text-xl font-black">Lojas cadastradas</h2>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar loja..." className="w-full rounded-2xl border border-white/10 bg-black/40 px-11 py-3 text-sm text-white focus:border-primary/60" />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" /> Carregando...
            </div>
          ) : filteredLojas.length === 0 ? (
            <div className="m-5 p-10 text-center text-gray-500">
              <Store className="mx-auto mb-3 h-10 w-10" /> Nenhuma loja encontrada.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredLojas.map((loja) => (
                <div key={loja.id} className="grid grid-cols-1 gap-4 bg-black/20 p-4 hover:bg-white/[0.04] md:grid-cols-[1.2fr_1fr_auto] md:items-center md:p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    {loja.logo_url ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10">
                        <img src={loja.logo_url} alt="Logo" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Store className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="mb-2 flex gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${loja.ativa ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                          {loja.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                          {loja.plano}
                        </span>
                      </div>
                      <h3 className="truncate text-xl font-black">{loja.nome}</h3>
                      <p className="mt-1 truncate text-sm font-bold text-gray-400">/{loja.slug}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2">
                    <MiniInfo icon={Phone} label="Telefone" value={loja.telefone || '-'} />
                    <MiniInfo icon={FileText} label="CNPJ" value={loja.cnpj || '-'} />
                    <MiniInfo icon={Calendar} label="Criada em" value={formatDate(loja.created_at)} />
                    <MiniInfo icon={MapPin} label="Endereço" value={loja.endereco || '-'} />
                  </div>

                  <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                    <button onClick={() => requestAccessStore(loja)} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary hover:bg-primary/20">
                      <ExternalLink className="h-3.5 w-3.5" /> Acessar
                    </button>
                    <button onClick={() => openUsersModal(loja)} className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-300 hover:bg-purple-500/20">
                      <Users className="h-3.5 w-3.5" /> Usuários
                    </button>
                    <button onClick={() => openEditModal(loja)} className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-400 hover:bg-blue-500/20">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => toggleStoreStatus(loja)}
                      disabled={quickActionKey === `store-status-${loja.id}`}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-60 ${loja.ativa ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                    >
                      {quickActionKey === `store-status-${loja.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                      {loja.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                    {/* NOVO BOTÃO DE EXCLUIR */}
                    <button onClick={() => confirmDeleteStore(loja)} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-transparent px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/10 transition">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
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
          logoFile={logoFile}
          onLogoChange={setLogoFile}
          onClose={() => setModalOpen(false)}
          onChange={handleChange}
          onSave={saveStore}
        />
      )}

      {usersModalOpen && selectedLojaUsers && (
        <UsersModal
          loja={selectedLojaUsers} users={lojaUsers} loadingUsers={loadingUsers} savingUser={savingUser} userForm={userForm} editingUser={editingUser}
          quickActionKey={quickActionKey}
          onClose={() => { setUsersModalOpen(false); setSelectedLojaUsers(null); setLojaUsers([]); setUserForm(emptyUserForm); setEditingUser(null); }}
          onChange={handleUserChange} onSaveUser={saveStoreUser} onToggleUser={toggleStoreUserStatus} onEditUser={editStoreUser} onDeleteUser={deleteStoreUser}
        />
      )}

      {accessLojaTarget && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-[#101010] text-white shadow-2xl animate-slide-up">
            <div className="p-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <ExternalLink className="h-7 w-7" />
              </div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Acesso de suporte
              </p>
              <h3 className="mt-2 text-2xl font-black">{accessLojaTarget.nome}</h3>
              <p className="mt-1 text-sm font-bold text-gray-400">/{accessLojaTarget.slug}</p>

              <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm font-black text-amber-300">Você vai entrar no ambiente desta loja.</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                  Use este acesso apenas para suporte, validação ou manutenção. O sistema trocará a loja ativa do navegador.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row">
              <button
                type="button"
                onClick={() => setAccessLojaTarget(null)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAccessStore}
                className="flex-1 rounded-2xl bg-primary py-3 text-sm font-black text-black hover:opacity-90"
              >
                Acessar loja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO MODAL: CONFIRMAÇÃO DE EXCLUSÃO DA LOJA */}
      {deletingUser && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-red-500/20 bg-[#101010] text-white shadow-2xl animate-slide-up">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black">Excluir usuário</h3>
              <p className="mt-2 text-sm text-gray-400">
                Tem certeza que deseja excluir <span className="font-bold text-white">{deletingUser.nome}</span>?
              </p>
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left">
                <p className="text-xs font-bold text-red-300">
                  Esta ação remove o acesso deste usuário à loja.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteStoreUser}
                disabled={isDeletingUser}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
              >
                {isDeletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteStoreModalOpen && deletingLoja && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-red-500/20 bg-[#101010] text-white shadow-2xl animate-slide-up">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black">Excluir Loja</h3>
              <p className="mt-2 text-sm text-gray-400">
                Tem certeza que deseja excluir a loja <span className="font-bold text-white">{deletingLoja.nome}</span>?
              </p>
              
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left">
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">Aviso Crítico</p>
                <p className="text-xs text-red-300">
                  Esta ação é irreversível. Certifique-se de que a loja não possui registros importantes vinculados a ela.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row">
              <button 
                type="button" 
                onClick={() => {
                  setDeleteStoreModalOpen(false);
                  setDeletingLoja(null);
                }} 
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleDeleteStore} 
                disabled={isDeleting} 
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreModal({
  editingLoja, form, saving, logoFile, onLogoChange, onClose, onChange, onSave,
}: {
  editingLoja: Loja | null; form: StoreFormData; saving: boolean; logoFile: File | null;
  onLogoChange: (file: File | null) => void; onClose: () => void; onChange: (field: keyof StoreFormData, value: string | boolean) => void; onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#101010] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{editingLoja ? 'Editar loja' : 'Nova loja'}</p>
            <h3 className="mt-1 text-2xl font-black">{editingLoja ? form.nome : 'Cadastrar unidade'}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white"><XCircle className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="mb-4 flex items-center gap-4 border-b border-white/10 pb-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-black/50 group hover:border-primary/50 transition">
                {(logoFile || form.logo_url) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onLogoChange(null);
                      onChange('logo_url', '');
                    }}
                    className="absolute z-20 top-1 right-1 bg-red-500/80 hover:bg-red-500 p-1 rounded-full text-white backdrop-blur-sm shadow-md"
                    title="Remover logo"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                )}
                <input
                  type="file" accept="image/*"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => { if (e.target.files && e.target.files[0]) onLogoChange(e.target.files[0]); }}
                />
                {logoFile || form.logo_url ? (
                  <img src={logoFile ? URL.createObjectURL(logoFile) : form.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-500 pointer-events-none">
                    <UploadCloud className="mb-1 h-6 w-6" />
                    <span className="text-[9px] font-black uppercase">Logo</span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-black">Dados principais da loja</p>
                <p className="text-xs text-gray-400">Informações e logo da unidade.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome da loja"><input value={form.nome} onChange={(e) => onChange('nome', e.target.value)} className={inputClass} /></Field>
              <Field label="Slug da loja"><input value={form.slug} onChange={(e) => onChange('slug', e.target.value)} className={inputClass} /></Field>
              <Field label="Telefone"><input value={form.telefone} onChange={(e) => onChange('telefone', e.target.value)} className={inputClass} /></Field>
              <Field label="CNPJ"><input value={form.cnpj} onChange={(e) => onChange('cnpj', e.target.value)} className={inputClass} /></Field>
              <div className="md:col-span-2"><Field label="Endereço"><textarea value={form.endereco} onChange={(e) => onChange('endereco', e.target.value)} className={`${inputClass} min-h-[90px]`} /></Field></div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400"><Settings className="h-6 w-6" /></div>
                <div><p className="font-black">Configurações</p><p className="text-xs text-gray-400">Plano, status e impressão.</p></div>
              </div>

              <div className="space-y-4">
                <Field label="Plano">
                  <select value={form.plano} onChange={(e) => onChange('plano', e.target.value)} className={inputClass}>
                    <option value="teste">Teste</option><option value="basico">Básico</option><option value="pro">Pro</option><option value="premium">Premium</option><option value="bloqueado">Bloqueado</option>
                  </select>
                </Field>
                <Field label="Nome da impressora"><input value={form.nomeImpressora} onChange={(e) => onChange('nomeImpressora', e.target.value)} className={inputClass} /></Field>
                
                <Field label="Cor do Sistema (Tema)">
                  <div className="flex flex-wrap gap-3 mt-2">
                    {[
                      { id: 'laranja', bg: 'bg-[#ff6a00]' },
                      { id: 'verde', bg: 'bg-[#22c55e]' },
                      { id: 'azul', bg: 'bg-[#3b82f6]' },
                      { id: 'roxo', bg: 'bg-[#8b5cf6]' },
                      { id: 'vermelho', bg: 'bg-[#e11d48]' }
                    ].map((cor) => (
                      <button
                        key={cor.id}
                        type="button"
                        onClick={() => onChange('tema', cor.id)}
                        className={`w-10 h-10 rounded-full ${cor.bg} transition-all hover:scale-110 shadow-lg ${
                          form.tema === cor.id ? 'ring-4 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-70'
                        }`}
                        title={`Tema ${cor.id}`}
                      />
                    ))}
                  </div>
                </Field>

                <button type="button" onClick={() => onChange('ativa', !form.ativa)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black ${form.ativa ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                  <span>{form.ativa ? 'Loja ativa' : 'Loja inativa'}</span><Power className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400"><LayoutGrid className="h-6 w-6" /></div>
                <div><p className="font-black">Mesas iniciais</p><p className="text-xs text-gray-400">Geradas automaticamente na criação.</p></div>
              </div>
              {!editingLoja ? (
                <Field label="Quantidade de mesas"><input value={form.quantidadeMesas} onChange={(e) => onChange('quantidadeMesas', e.target.value)} type="number" min="0" className={inputClass} /></Field>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">A quantidade de mesas iniciais só pode ser definida na criação da loja. Depois, edite as mesas dentro da operação da unidade.</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white">Cancelar</button>
          <button type="button" onClick={onSave} disabled={saving} className="flex-1 rounded-2xl bg-primary py-4 text-sm font-black text-black disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editingLoja ? 'Salvar alterações' : 'Criar loja'}
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
  quickActionKey,
  userForm,
  editingUser,
  onClose,
  onChange,
  onSaveUser,
  onToggleUser,
  onEditUser,
  onDeleteUser,
}: {
  loja: Loja;
  users: LojaUsuario[];
  loadingUsers: boolean;
  savingUser: boolean;
  quickActionKey: string | null;
  userForm: UserFormData;
  editingUser: LojaUsuario | null;
  onClose: () => void;
  onChange: (field: keyof UserFormData, value: string) => void;
  onSaveUser: () => void;
  onToggleUser: (usuario: LojaUsuario) => void;
  onEditUser: (usuario: LojaUsuario) => void;
  onDeleteUser: (usuario: LojaUsuario) => void;
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
                  <p className="font-black">{editingUser ? 'Editar usuário' : 'Novo usuário'}</p>
                  <p className="text-xs text-gray-400">
                    {editingUser ? 'Atualizando dados do operador.' : 'Crie o acesso do operador desta loja.'}
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

                <Field label={editingUser ? 'Nova Senha (opcional)' : 'Senha'}>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={userForm.senha}
                      onChange={(event) => onChange('senha', event.target.value)}
                      type="password"
                      placeholder={editingUser ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
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
                  </select>
                </Field>

                <button
                  type="button"
                  onClick={onSaveUser}
                  disabled={savingUser}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {savingUser ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {editingUser ? 'Salvar Alterações' : 'Criar usuário'}
                    </>
                  )}
                </button>

                {editingUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('nome', '');
                      onChange('username', '');
                      onChange('senha', '');
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-transparent py-4 text-sm font-black text-gray-400 transition hover:bg-white/5"
                  >
                    Cancelar edição
                  </button>
                )}
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

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onEditUser(usuario)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-400 transition hover:bg-blue-500/20"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => onDeleteUser(usuario)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-400 transition hover:bg-red-500/20"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleUser(usuario)}
                          disabled={quickActionKey === `user-status-${usuario.id}`}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                            usuario.ativo
                              ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          } disabled:opacity-60`}
                        >
                          {quickActionKey === `user-status-${usuario.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          {usuario.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
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
