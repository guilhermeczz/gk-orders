import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import {
  Plus,
  Trash2,
  ArrowLeft,
  X,
  ShieldCheck,
  Loader2,
  UserCog,
  Lock,
  Sparkles,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

const getInitials = (name: string) => {
  return (
    name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U'
  );
};

const getAvatarColor = (name: string) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const isProtectedDevUser = (user: { name?: string; username?: string }) => {
  const name = String(user.name || '').trim().toLowerCase();
  const username = String(user.username || '').trim().toLowerCase();
  return name === 'desenvolvedor' || username === 'dev';
};

export function UsersPage() {
  const { users, deleteUser, fetchUsers } = useAppStore();
  const { register } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [formErrors, setFormErrors] = useState<{
  name?: boolean;
  username?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}>({});

  const [deleteTarget, setDeleteTarget] = useState<null | {
    id: string;
    name: string;
    username: string;
  }>(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (fetchUsers) fetchUsers();
  }, [fetchUsers]);

  const protectedUsersCount = useMemo(() => {
    return users.filter((u) => isProtectedDevUser(u)).length;
  }, [users]);

  const operatorsCount = useMemo(() => {
    return users.length;
  }, [users]);

const handleSubmit = async () => {
  const nextErrors = {
    name: !name.trim(),
    username: !username.trim(),
    password: !password || password.length < 6,
    confirmPassword: !confirmPassword || password !== confirmPassword,
  };

  setFormErrors(nextErrors);

  if (nextErrors.name) {
    toast.error('Informe o nome completo do operador.');
    return;
  }

  if (nextErrors.username) {
    toast.error('Informe o nome de usuário.');
    return;
  }

  if (nextErrors.password) {
    toast.error('A senha deve ter no mínimo 6 caracteres.');
    return;
  }

  if (nextErrors.confirmPassword) {
    toast.error('As senhas não coincidem.');
    return;
  }

  setLoading(true);

  const success = await register(name.trim(), username.trim(), password);

  if (success) {
    setTimeout(async () => {
      if (fetchUsers) await fetchUsers();

      toast.success('Operador cadastrado e liberado!');

      setName('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setFormErrors({});
      setShowForm(false);
      setLoading(false);
    }, 1000);
  } else {
    setLoading(false);
  }
};

  const requestDelete = (user: { id: string; name: string; username: string }) => {
    if (isProtectedDevUser(user)) {
      toast.error('O acesso do Desenvolvedor é protegido e não pode ser removido.');
      return;
    }

    setDeleteTarget(user);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover usuário.');
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    'w-full bg-white text-black placeholder:text-gray-400 border border-border rounded-xl px-4 py-3.5 focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.3)] outline-none transition-all font-medium';
  const inputErrorClass =
  'border-red-500 ring-4 ring-red-500/10 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.25)]';

const inputSuccessClass =
  'border-green-500/60 focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.2)]';


return (
  <>
    <div className="print:hidden">
      <AppHeader />
    </div>

    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6 animate-fade-in">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8 border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all active:scale-95 shadow-sm hover:-translate-x-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <h2 className="text-3xl font-black text-primary drop-shadow-sm flex items-center gap-3">
                <UserCog className="w-8 h-8" />
                Equipe e Acessos
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie operadores, logins e acessos do sistema.
              </p>
            </div>
          </div>

          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setFormErrors({});
              }}              className="bg-primary text-black font-black px-6 py-3 rounded-xl text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(255,106,0,0.3)]"
            >
              <Plus className="w-5 h-5" />
              Adicionar Operador
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider mb-2">
              <UserCog className="w-4 h-4" />
              Total de acessos
            </div>
            <p className="text-3xl font-black text-foreground">{operatorsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Usuários cadastrados no sistema</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-green-500 font-black text-xs uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4" />
              Acesso protegido
            </div>
            <p className="text-3xl font-black text-foreground">{protectedUsersCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Conta Dev blindada contra exclusão</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-purple-500 font-black text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              Gestão rápida
            </div>
            <p className="text-lg font-black text-foreground">Painel otimizado</p>
            <p className="text-xs text-muted-foreground mt-1">Visual mais claro e seguro para operação</p>
          </div>
        </div>

        {showForm && (
          <div
            style={{ backgroundColor: '#111' }}
            className="border border-gray-800 p-6 rounded-2xl shadow-2xl mb-8 relative overflow-hidden animate-fade-in text-white"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />

            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-xl flex items-center gap-2">
                  <ShieldCheck className="text-primary" />
                  Cadastrar Operador
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Crie um novo acesso para uso no sistema.
                </p>
              </div>

              <button
                onClick={() => {
                setShowForm(false);
                setFormErrors({});
              }}
                className="p-2 text-gray-400 hover:text-destructive hover:bg-destructive/20 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="text-sm font-bold text-gray-300 mb-2 block">Nome completo</label>
                <input
  value={name}
  onChange={(e) => {
    setName(e.target.value);

    if (formErrors.name && e.target.value.trim()) {
      setFormErrors((prev) => ({ ...prev, name: false }));
    }
  }}
  placeholder="Ex: João Silva"
  className={`${inputClass} ${
    formErrors.name ? inputErrorClass : name.trim() ? inputSuccessClass : ''
  }`}
/>

{formErrors.name && (
  <p className="mt-2 text-xs font-bold text-red-500">
    O nome completo é obrigatório.
  </p>
)}
              </div>
              <div>
                <label className="text-sm font-bold text-gray-300 mb-2 block">Nome de usuário (Login)</label>
<input
  value={username}
  onChange={(e) => {
    setUsername(e.target.value);

    if (formErrors.username && e.target.value.trim()) {
      setFormErrors((prev) => ({ ...prev, username: false }));
    }
  }}
  placeholder="Ex: joao.silva"
  className={`${inputClass} ${
    formErrors.username ? inputErrorClass : username.trim() ? inputSuccessClass : ''
  }`}
/>

{formErrors.username && (
  <p className="mt-2 text-xs font-bold text-red-500">
    O nome de usuário é obrigatório.
  </p>
)}              </div>
              <div>
                <label className="text-sm font-bold text-gray-300 mb-2 block">Senha de Acesso</label>
<input
  value={password}
  onChange={(e) => {
    setPassword(e.target.value);

    if (formErrors.password && e.target.value.length >= 6) {
      setFormErrors((prev) => ({ ...prev, password: false }));
    }

    if (confirmPassword && e.target.value === confirmPassword) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: false }));
    }
  }}
  type="password"
  placeholder="Mínimo 6 caracteres"
  className={`${inputClass} ${
    formErrors.password ? inputErrorClass : password.length >= 6 ? inputSuccessClass : ''
  }`}
/>

{formErrors.password && (
  <p className="mt-2 text-xs font-bold text-red-500">
    A senha precisa ter no mínimo 6 caracteres.
  </p>
)}              </div>
              <div>
                <label className="text-sm font-bold text-gray-300 mb-2 block">Confirmar Senha</label>
<input
  value={confirmPassword}
  onChange={(e) => {
    setConfirmPassword(e.target.value);

    if (formErrors.confirmPassword && password === e.target.value) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: false }));
    }
  }}
  type="password"
  placeholder="Repita a senha"
  className={`${inputClass} ${
    formErrors.confirmPassword
      ? inputErrorClass
      : confirmPassword && password === confirmPassword
        ? inputSuccessClass
        : ''
  }`}
/>

{formErrors.confirmPassword && (
  <p className="mt-2 text-xs font-bold text-red-500">
    As senhas precisam ser iguais.
  </p>
)}              </div>
            </div>

            <div className="bg-background/40 border border-gray-800 rounded-xl p-4 mb-5">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-white">Política de acesso</p>
                  <p className="text-sm text-gray-400 mt-1">
                    O usuário Desenvolvedor possui proteção permanente contra exclusão.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-2 py-4 rounded-xl bg-primary text-black font-black text-[15px] shadow-lg disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando Acesso...
                </>
              ) : (
                'Confirmar Cadastro'
              )}
            </button>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-foreground">Operadores cadastrados</h3>
            <p className="text-sm text-muted-foreground">
              Visualize os acessos ativos e gerencie permissões básicas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.length === 0 && !showForm && (
            <p className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border font-medium">
              Nenhum usuário cadastrado além do administrador.
            </p>
          )}

          {users.map((u) => {
            const isProtected = isProtectedDevUser(u);

            return (
              <div
                key={u.id}
                className={`relative flex items-center justify-between rounded-2xl p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group border ${
                  isProtected
                    ? 'bg-card border-primary/40 shadow-[0_0_20px_rgba(255,106,0,0.08)]'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                {isProtected && (
                  <div className="absolute top-3 right-3">
                    <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Protegido
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner ${getAvatarColor(
                      u.name
                    )}`}
                  >
                    {getInitials(u.name)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-black text-foreground group-hover:text-primary transition-colors truncate">
                        {u.name}
                      </p>

                      {isProtected && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                          Dev
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded-md mt-1">
                      @{u.username}
                    </p>

                    <p className="text-xs text-muted-foreground mt-2">
                      {isProtected
                        ? 'Acesso principal protegido contra exclusão.'
                        : 'Operador ativo no sistema.'}
                    </p>
                  </div>
                </div>

                {isProtected ? (
                  <div className="ml-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border text-muted-foreground">
                    <Lock className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold hidden sm:inline">Bloqueado</span>
                  </div>
                ) : (
                  <button
                    onClick={() => requestDelete(u)}
                    className="ml-4 p-3 border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-xl transition-all active:scale-90 opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm"
                    title={`Excluir ${u.name}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-red-500/25 rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] overflow-hidden animate-slide-up text-white">
            <div className="h-1.5 bg-gradient-to-r from-primary via-orange-500 to-red-500" />

            <div className="p-6 border-b border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-inner">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>

                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400 mb-1">
                    Ação destrutiva
                  </p>
                  <h3 className="text-2xl font-black leading-tight">Excluir operador</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Esta ação remove o acesso do operador ao sistema.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl border border-border bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Usuário selecionado
                </p>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner ${getAvatarColor(
                      deleteTarget.name
                    )}`}
                  >
                    {getInitials(deleteTarget.name)}
                  </div>

                  <div>
                    <p className="text-lg font-black text-white">{deleteTarget.name}</p>
                    <p className="text-sm text-gray-400">@{deleteTarget.username}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-400">Confirmação necessária</p>
                    <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                      Deseja realmente excluir este operador? Essa ação é sensível e o acesso será removido desta tela.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-4 rounded-2xl border border-white/10 bg-[#181818] hover:bg-[#222] text-white font-bold transition-all"
              >
                Cancelar
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(220,38,38,0.35)] disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Confirmar exclusão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        )}
    </div>
  </>
);
}