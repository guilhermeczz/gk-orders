import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';
import { toast } from 'sonner';
import {
  DEFAULT_LOJA_ID,
  setCurrentStoreId,
  clearCurrentStoreId,
} from './current-store';

interface AuthUser {
  id: string;
  name: string;
  username: string;
  lojaId: string | null;
  perfil: string;
  isDeveloper: boolean;
}

interface RegisterOptions {
  lojaId?: string | null;
  perfil?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    username: string,
    password: string,
    options?: RegisterOptions
  ) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function isDeveloperUser(username?: string | null, name?: string | null) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim().toLowerCase();

  return (
    normalizedUsername === 'dev' ||
    normalizedUsername === 'dev2' ||
    normalizedName === 'desenvolvedor'
  );
}

function normalizeUsername(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .trim();
}

async function getUserStoreInfo(userId: string, username: string, name: string) {
  const developer = isDeveloperUser(username, name);

  if (developer) {
    return {
      lojaId: DEFAULT_LOJA_ID,
      perfil: 'desenvolvedor',
      isDeveloper: true,
      ativo: true,
    };
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, loja_id, perfil, ativo')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (usuarioError) {
    console.error('Erro ao buscar usuário na tabela usuarios:', usuarioError);
  }

  if (usuario?.ativo === false) {
    return {
      lojaId: null,
      perfil: usuario?.perfil || 'operador',
      isDeveloper: false,
      ativo: false,
    };
  }

  if (usuario?.loja_id) {
    return {
      lojaId: String(usuario.loja_id),
      perfil: usuario?.perfil || 'operador',
      isDeveloper: false,
      ativo: true,
    };
  }

  if (usuario?.id) {
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuario_lojas')
      .select('loja_id, perfil, ativo')
      .eq('usuario_id', usuario.id)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();

    if (vinculoError) {
      console.error('Erro ao buscar vínculo usuario_lojas:', vinculoError);
    }

    if (vinculo?.loja_id) {
      return {
        lojaId: String(vinculo.loja_id),
        perfil: vinculo?.perfil || usuario?.perfil || 'operador',
        isDeveloper: false,
        ativo: vinculo?.ativo ?? true,
      };
    }
  }

  return {
    lojaId: null,
    perfil: usuario?.perfil || 'operador',
    isDeveloper: false,
    ativo: true,
  };
}

async function formatUser(supabaseUser: any): Promise<AuthUser> {
  const name = supabaseUser.user_metadata?.full_name || 'Operador';

  const username =
    supabaseUser.user_metadata?.username ||
    supabaseUser.email?.split('@')[0] ||
    '';

  const storeInfo = await getUserStoreInfo(supabaseUser.id, username, name);

  return {
    id: supabaseUser.id,
    name,
    username,
    lojaId: storeInfo.lojaId,
    perfil: storeInfo.perfil,
    isDeveloper: storeInfo.isDeveloper,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const applyUserStore = useCallback((authUser: AuthUser) => {
    if (authUser.isDeveloper) {
      const savedStore = localStorage.getItem('gk_orders_current_store_id');

      if (!savedStore) {
        setCurrentStoreId(DEFAULT_LOJA_ID);
      }

      return;
    }

    if (authUser.lojaId) {
      setCurrentStoreId(authUser.lojaId);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          const authUser = await formatUser(session.user);

          const storeInfo = await getUserStoreInfo(
            session.user.id,
            authUser.username,
            authUser.name
          );

          if (storeInfo.ativo === false) {
            await supabase.auth.signOut();
            clearCurrentStoreId();
            setUser(null);
            toast.error('Usuário inativo. Fale com o administrador.');
            setIsInitializing(false);
            return;
          }

          if (!authUser.isDeveloper && !authUser.lojaId) {
            await supabase.auth.signOut();
            clearCurrentStoreId();
            setUser(null);
            toast.error('Usuário sem loja vinculada. Fale com o administrador.');
            setIsInitializing(false);
            return;
          }

          setUser(authUser);
          applyUserStore(authUser);
        }
      } catch (error) {
        console.error('Erro ao iniciar autenticação:', error);
        setUser(null);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const authUser = await formatUser(session.user);

        const storeInfo = await getUserStoreInfo(
          session.user.id,
          authUser.username,
          authUser.name
        );

        if (storeInfo.ativo === false) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Usuário inativo. Fale com o administrador.');
          return;
        }

        if (!authUser.isDeveloper && !authUser.lojaId) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Usuário sem loja vinculada. Fale com o administrador.');
          return;
        }

        setUser(authUser);
        applyUserStore(authUser);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyUserStore]);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const cleanUsername = normalizeUsername(username);

        if (!cleanUsername || !password) {
          toast.error('Informe usuário e senha.');
          return false;
        }

        const email = `${cleanUsername}@gk.com`;

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          toast.error('Usuário ou senha inválidos.');
          return false;
        }

        const authUser = await formatUser(data.user);

        const storeInfo = await getUserStoreInfo(
          data.user.id,
          authUser.username,
          authUser.name
        );

        if (storeInfo.ativo === false) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Usuário inativo. Fale com o administrador.');
          return false;
        }

        if (!authUser.isDeveloper && !authUser.lojaId) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Usuário sem loja vinculada. Fale com o administrador.');
          return false;
        }

        setUser(authUser);
        applyUserStore(authUser);

        toast.success(`Bem-vindo, ${authUser.name || cleanUsername}!`);
        return true;
      } catch (err) {
        console.error('Erro no login:', err);
        toast.error('Erro inesperado ao conectar ao servidor.');
        return false;
      }
    },
    [applyUserStore]
  );

  const register = useCallback(
    async (
      name: string,
      username: string,
      password: string,
      options?: RegisterOptions
    ): Promise<boolean> => {
      try {
        const cleanName = name.trim();
        const cleanUsername = normalizeUsername(username);
        const lojaId = options?.lojaId || null;
        const perfil = options?.perfil || 'operador';

        if (!cleanName || !cleanUsername || !password) {
          toast.error('Preencha todos os campos.');
          return false;
        }

        if (password.length < 6) {
          toast.error('A senha precisa ter no mínimo 6 caracteres.');
          return false;
        }

        if (!lojaId && !isDeveloperUser(cleanUsername, cleanName)) {
          toast.error('Selecione uma loja para vincular este usuário.');
          return false;
        }

        const { data, error } = await supabase.functions.invoke('create-operator', {
          body: {
            nome: cleanName,
            username: cleanUsername,
            senha: password,
            lojaId,
            perfil,
          },
        });

        if (error) {
          console.error('Erro ao chamar create-operator:', error);
          toast.error('Não foi possível criar o operador.');
          return false;
        }

        if (data?.error) {
          toast.error(data.error);
          return false;
        }

        toast.success('Operador criado com sucesso!');
        return true;
      } catch (err) {
        console.error('Erro no cadastro:', err);
        toast.error('Erro inesperado no cadastro.');
        return false;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearCurrentStoreId();
    setUser(null);
    toast.info('Sessão encerrada.');
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="font-medium text-primary">Iniciando sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro do AuthProvider');
  }

  return ctx;
}