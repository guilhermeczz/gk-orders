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
  ativo?: boolean;      // ADICIONADO: Otimização para não consultar 2x
  lojaAtiva?: boolean;  // ADICIONADO: Otimização para não consultar 2x
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
      lojaId: '',
      perfil: 'desenvolvedor',
      isDeveloper: true,
      ativo: true,
      lojaAtiva: true,
    };
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select(`
      id, 
      loja_id, 
      perfil, 
      ativo,
      lojas ( ativa )
    `)
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
      lojaAtiva: false,
    };
  }

  const lojaDoUsuarioAtiva = usuario?.lojas && !Array.isArray(usuario.lojas) ? (usuario.lojas as any).ativa : true;

  if (usuario?.loja_id) {
    return {
      lojaId: String(usuario.loja_id),
      perfil: usuario?.perfil || 'operador',
      isDeveloper: false,
      ativo: true,
      lojaAtiva: lojaDoUsuarioAtiva,
    };
  }

  if (usuario?.id) {
    const { data: vinculo, error: vinculoError } = await supabase
      .from('usuario_lojas')
      .select(`
        loja_id, 
        perfil, 
        ativo,
        lojas ( ativa )
      `)
      .eq('usuario_id', usuario.id)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();

    if (vinculoError) {
      console.error('Erro ao buscar vínculo usuario_lojas:', vinculoError);
    }

    if (vinculo?.loja_id) {
      const lojaDoVinculoAtiva = vinculo?.lojas && !Array.isArray(vinculo.lojas) ? (vinculo.lojas as any).ativa : true;

      return {
        lojaId: String(vinculo.loja_id),
        perfil: vinculo?.perfil || usuario?.perfil || 'operador',
        isDeveloper: false,
        ativo: vinculo?.ativo ?? true,
        lojaAtiva: lojaDoVinculoAtiva,
      };
    }
  }

  return {
    lojaId: null,
    perfil: usuario?.perfil || 'operador',
    isDeveloper: false,
    ativo: true,
    lojaAtiva: true,
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
    ativo: storeInfo.ativo,
    lojaAtiva: storeInfo.lojaAtiva,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const applyUserStore = useCallback((authUser: AuthUser) => {
    if (authUser.isDeveloper) {
      const savedStore = localStorage.getItem('gk_orders_current_store_id');
      if (!savedStore) {
        setCurrentStoreId('');
      }
      return;
    }

    if (authUser.lojaId) {
      setCurrentStoreId(authUser.lojaId);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // BLINDAGEM MÁXIMA: Se o Supabase travar na rede, forçamos a liberação da tela após 5 segundos.
    const forceStopTimer = setTimeout(() => {
      if (isMounted) {
        setIsInitializing(false);
      }
    }, 5000);

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const authUser = await formatUser(session.user);

          if (authUser.ativo === false) {
            await supabase.auth.signOut();
            clearCurrentStoreId();
            setUser(null);
            toast.error('Acesso bloqueado: Usuário inativo.');
            return;
          }

          if (authUser.lojaAtiva === false && !authUser.isDeveloper) {
            await supabase.auth.signOut();
            clearCurrentStoreId();
            setUser(null);
            toast.error('Acesso bloqueado: A loja vinculada está inativa.');
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
        }
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error);
        setUser(null);
      } finally {
        // Garantia de que a tela de loading vai sumir, independentemente de erros
        clearTimeout(forceStopTimer);
        setIsInitializing(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Ignora o evento inicial pois o getSession já fez o trabalho pesado na montagem
      if (event === 'INITIAL_SESSION') return;

      if (session?.user) {
        const authUser = await formatUser(session.user);

        if (authUser.ativo === false) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Acesso bloqueado: Usuário inativo.');
          return;
        }

        if (authUser.lojaAtiva === false && !authUser.isDeveloper) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Acesso bloqueado: A loja vinculada está inativa.');
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
      isMounted = false;
      clearTimeout(forceStopTimer);
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

        // OTIMIZAÇÃO: formatUser agora já traz as validações de ativo/inativo num único pacote
        const authUser = await formatUser(data.user);

        if (authUser.ativo === false) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Acesso bloqueado: Usuário inativo.');
          return false;
        }

        if (authUser.lojaAtiva === false && !authUser.isDeveloper) {
          await supabase.auth.signOut();
          clearCurrentStoreId();
          setUser(null);
          toast.error('Acesso bloqueado: A loja vinculada está inativa.');
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