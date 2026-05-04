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
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const formatUser = (supabaseUser: any): AuthUser => ({
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || 'Operador',
    username:
      supabaseUser.user_metadata?.username ||
      supabaseUser.email?.split('@')[0] ||
      '',
  });

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(formatUser(session.user));
      }

      setIsInitializing(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(formatUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const cleanUsername = username.toLowerCase().trim();

        if (!cleanUsername || !password) {
          toast.error('Informe usuário e senha.');
          return false;
        }

        const email = `${cleanUsername}@gardens.com`;

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error('Usuário ou senha inválidos.');
          return false;
        }

        if (data.user) {
          setUser(formatUser(data.user));
          toast.success(
            `Bem-vindo, ${data.user.user_metadata?.full_name || cleanUsername}!`
          );
        }

        return true;
      } catch (err) {
        console.error('Erro no login:', err);
        toast.error('Erro inesperado ao conectar ao servidor.');
        return false;
      }
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      username: string,
      password: string
    ): Promise<boolean> => {
      try {
        const cleanName = name.trim();
        const cleanUsername = username.toLowerCase().trim();

        if (!cleanName || !cleanUsername || !password) {
          toast.error('Preencha todos os campos.');
          return false;
        }

        if (password.length < 6) {
          toast.error('A senha precisa ter no mínimo 6 caracteres.');
          return false;
        }

        /**
         * IMPORTANTE:
         * Guardamos a sessão atual antes de criar o novo operador.
         * O Supabase Auth pode trocar a sessão para o usuário recém-criado.
         * Depois do cadastro, restauramos a sessão anterior.
         */
        const {
          data: { session: previousSession },
        } = await supabase.auth.getSession();

        const previousUser = previousSession?.user ?? null;

        const email = `${cleanUsername}@gardens.com`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: cleanName,
              username: cleanUsername,
            },
          },
        });

        if (error) {
          if (
            error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already exists') ||
            error.message.toLowerCase().includes('user already registered')
          ) {
            toast.error('Este nome de usuário já está em uso.');
          } else if (error.message.toLowerCase().includes('password')) {
            toast.error('Erro: A senha precisa ter no mínimo 6 caracteres.');
          } else {
            toast.error('Erro ao criar operador.');
          }

          return false;
        }

        if (!data.user) {
          toast.error('Não foi possível criar o operador.');
          return false;
        }

        const { error: dbError } = await supabase.from('usuarios').upsert([
          {
            id: data.user.id,
            nome: cleanName,
            username: cleanUsername,
          },
        ]);

        if (dbError) {
          console.error('Erro ao inserir usuário na tabela usuarios:', dbError);
          toast.error('Operador criado no Auth, mas não foi salvo na tabela de usuários.');
          return false;
        }

        /**
         * Restaura a sessão anterior caso o Supabase tenha logado no usuário novo.
         */
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        const currentUserId = currentSession?.user?.id ?? null;
        const previousUserId = previousUser?.id ?? null;

        if (
          previousSession?.access_token &&
          previousSession?.refresh_token &&
          previousUserId &&
          currentUserId &&
          currentUserId !== previousUserId
        ) {
          const { error: restoreError } = await supabase.auth.setSession({
            access_token: previousSession.access_token,
            refresh_token: previousSession.refresh_token,
          });

          if (restoreError) {
            console.error('Erro ao restaurar sessão anterior:', restoreError);
            toast.warning(
              'Operador criado, mas foi necessário refazer o login do administrador.'
            );
            setUser(null);
            return true;
          }

          setUser(formatUser(previousUser));
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

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast.info('Sessão encerrada.');
  }, []);

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
  if (!ctx) throw new Error('useAuth deve ser usado dentro do AuthProvider');
  return ctx;
}