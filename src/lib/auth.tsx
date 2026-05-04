import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';
import { toast } from 'sonner';

interface AuthUser {
  id: string;
  name: string;
  username: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (name: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function buildAuthEmail(usernameOrEmail: string) {
  const cleanValue = normalizeUsername(usernameOrEmail);

  if (cleanValue.includes('@')) {
    return cleanValue;
  }

  return `${cleanValue}@gardens.com`;
}

function getUsernameFromEmail(email?: string | null) {
  if (!email) return '';
  return email.split('@')[0] || '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getValidSystemUser = useCallback(async (supabaseUser: any): Promise<AuthUser | null> => {
    if (!supabaseUser?.id) return null;

    const { data: dbUser, error } = await supabase
      .from('usuarios')
      .select('id, nome, username')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao validar usuário na tabela usuarios:', error);
      return null;
    }

    if (!dbUser) {
      return null;
    }

    return {
      id: String(dbUser.id),
      name: dbUser.nome || supabaseUser.user_metadata?.full_name || 'Operador',
      username:
        dbUser.username ||
        supabaseUser.user_metadata?.username ||
        getUsernameFromEmail(supabaseUser.email),
    };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast.info('Sessão encerrada.');
  }, []);

  const validateCurrentSession = useCallback(
    async (showMessage = false) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        return false;
      }

      const validUser = await getValidSystemUser(session.user);

      if (!validUser) {
        await supabase.auth.signOut();
        setUser(null);

        if (showMessage) {
          toast.error('Seu usuário foi removido ou perdeu permissão de acesso.');
        }

        return false;
      }

      setUser(validUser);
      return true;
    },
    [getValidSystemUser]
  );

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const valid = await validateCurrentSession(false);

        if (!isMounted) return;

        if (!valid) {
          setUser(null);
        }
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const validateSession = async () => {
        if (!session?.user) {
          setUser(null);
          return;
        }

        const validUser = await getValidSystemUser(session.user);

        if (!validUser) {
          await supabase.auth.signOut();
          setUser(null);
          toast.error('Usuário removido ou sem permissão de acesso.');
          return;
        }

        setUser(validUser);
      };

      validateSession();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [getValidSystemUser, validateCurrentSession]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (userRef.current) {
        validateCurrentSession(true);
      }
    }, 5000);

    const handleFocus = () => {
      if (userRef.current) {
        validateCurrentSession(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        validateCurrentSession(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [validateCurrentSession]);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const cleanUsername = normalizeUsername(username);

        if (!cleanUsername) {
          toast.error('Informe o usuário ou e-mail.');
          return false;
        }

        if (!password) {
          toast.error('Informe a senha.');
          return false;
        }

        const email = buildAuthEmail(cleanUsername);

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          toast.error('Usuário ou senha inválidos.');
          return false;
        }

        const validUser = await getValidSystemUser(data.user);

        if (!validUser) {
          await supabase.auth.signOut();
          setUser(null);
          toast.error('Usuário removido ou sem permissão de acesso.');
          return false;
        }

        setUser(validUser);
        toast.success(`Bem-vindo, ${validUser.name}!`);

        return true;
      } catch (err) {
        console.error('Erro no login:', err);
        toast.error('Erro inesperado ao conectar ao servidor.');
        return false;
      }
    },
    [getValidSystemUser]
  );

  const register = useCallback(
    async (name: string, username: string, password: string): Promise<boolean> => {
      try {
        const cleanName = name.trim();
        const cleanUsername = normalizeUsername(username);

        if (!cleanName) {
          toast.error('Informe o nome do usuário.');
          return false;
        }

        if (!cleanUsername) {
          toast.error('Informe o usuário.');
          return false;
        }

        if (!password || password.length < 6) {
          toast.error('A senha precisa ter no mínimo 6 dígitos.');
          return false;
        }

        const email = buildAuthEmail(cleanUsername);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: cleanName,
              username: cleanUsername.includes('@')
                ? getUsernameFromEmail(cleanUsername)
                : cleanUsername,
            },
          },
        });

        if (error) {
          const message = error.message.toLowerCase();

          if (
            message.includes('already registered') ||
            message.includes('user already registered') ||
            message.includes('already exists')
          ) {
            toast.error('Este usuário já está em uso.');
          } else {
            toast.error('Erro ao criar usuário. Verifique os dados informados.');
          }

          return false;
        }

        if (!data.user) {
          toast.error('Não foi possível criar o usuário.');
          return false;
        }

        const usernameToSave = cleanUsername.includes('@')
          ? getUsernameFromEmail(cleanUsername)
          : cleanUsername;

        const { error: dbError } = await supabase.from('usuarios').upsert([
          {
            id: data.user.id,
            nome: cleanName,
            username: usernameToSave,
          },
        ]);

        if (dbError) {
          console.error('Erro ao inserir usuário na tabela usuarios:', dbError);
          toast.error('Usuário criado no Auth, mas houve erro ao salvar no sistema.');
          return false;
        }

        toast.success('Conta criada com sucesso!');
        return true;
      } catch (err) {
        console.error('Erro no cadastro:', err);
        toast.error('Erro inesperado no cadastro.');
        return false;
      }
    },
    []
  );

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-primary font-medium">Iniciando sistema...</span>
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