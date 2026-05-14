import { useMemo, useState, useEffect } from 'react';
import {
  Menu,
  X,
  Home,
  Package,
  BarChart3,
  LogOut,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Store,
  Bike,
  UserRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import logoFull from '@/assets/logo-full.png';

type NavItem = {
  to: '/dashboard' | '/delivery' | '/customers' | '/paid-orders' | '/products' | '/reports' | '/cash-register' | '/developer';
  label: string;
  icon: any;
  allowedRoles: string[]; // Controle de permissão
};

// CORRIGIDO AQUI: Trocamos 'admin' por 'admin_loja' para bater com o banco de dados!
const baseNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Início', icon: Home, allowedRoles: ['admin_loja', 'operador', 'desenvolvedor'] },
  { to: '/delivery', label: 'Delivery', icon: Bike, allowedRoles: ['admin_loja', 'operador', 'desenvolvedor'] },
  { to: '/customers', label: 'Clientes', icon: UserRound, allowedRoles: ['admin_loja', 'operador', 'desenvolvedor'] },
  { to: '/paid-orders', label: 'Pedidos Pagos', icon: CheckCircle2, allowedRoles: ['admin_loja', 'desenvolvedor'] },
  { to: '/products', label: 'Produtos', icon: Package, allowedRoles: ['admin_loja', 'desenvolvedor'] },
  { to: '/reports', label: 'Relatórios', icon: BarChart3, allowedRoles: ['admin_loja', 'desenvolvedor'] },
  { to: '/cash-register', label: 'Controle de Caixa', icon: Wallet, allowedRoles: ['admin_loja', 'desenvolvedor'] },
];

export const THEMES: Record<string, string> = {
  laranja: '25 100% 50%',
  verde: '142 71% 45%', 
  azul: '217 91% 60%',  
  roxo: '262 83% 58%',  
  vermelho: '348 83% 47%', 
};

export function AppHeader({ onNewOrder }: { onNewOrder?: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const { lojaAtualId } = useAppStore();
  const [storeName, setStoreName] = useState<string>('');
  const [storeLogo, setStoreLogo] = useState<string | null>(null);

  const isDeveloper =
    String(user?.username || '').toLowerCase() === 'dev' ||
    String(user?.name || '').toLowerCase() === 'desenvolvedor';

  // Filtra o menu baseado no perfil
  const navItems = useMemo(() => {
    const userRole = user?.perfil || 'operador';

    const items = baseNavItems.filter((item) => 
      isDeveloper || item.allowedRoles.includes(userRole)
    );

    if (isDeveloper) {
      items.push({ 
        to: '/developer', 
        label: 'Painel do Desenvolvedor', 
        icon: ShieldCheck, 
        allowedRoles: ['desenvolvedor'] 
      });
    }
    
    return items;
  }, [isDeveloper, user?.perfil]);

  useEffect(() => {
    let isMounted = true;

    async function fetchStoreData() {
      if (!lojaAtualId) {
        if (isMounted) {
          setStoreName('Nenhuma loja selecionada');
          setStoreLogo(null);
          document.documentElement.style.setProperty('--primary', THEMES.laranja);
          document.documentElement.style.setProperty('--ring', THEMES.laranja);
        }
        return;
      }

      const { data, error } = await supabase
        .from('lojas')
        .select(`
          nome, 
          logo_url,
          configuracoes_loja ( tema )
        `)
        .eq('id', lojaAtualId)
        .single();

      if (!error && data && isMounted) {
        setStoreName(data.nome);
        setStoreLogo(data.logo_url);

        const configuracoes = Array.isArray(data.configuracoes_loja) ? data.configuracoes_loja[0] : data.configuracoes_loja;
        const temaBanco = configuracoes?.tema || 'laranja';
        const activeTheme = THEMES[temaBanco] || THEMES.laranja;
        
        document.documentElement.style.setProperty('--primary', activeTheme);
        document.documentElement.style.setProperty('--ring', activeTheme);
      }
    }

    fetchStoreData();

    return () => {
      isMounted = false;
    };
  }, [lojaAtualId]);

  const handleLogout = async () => {
    try {
      document.documentElement.style.setProperty('--primary', THEMES.laranja);
      document.documentElement.style.setProperty('--ring', THEMES.laranja);
      await logout?.();
      toast.success('Você saiu do sistema.');
      setDrawerOpen(false);
      navigate({ to: '/' });
    } catch (err) {
      toast.error('Erro ao sair do sistema.');
    }
  };

  const currentPath = location.pathname?.replace(/\/$/, '') || '';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border transition-all print:hidden shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-all active:scale-95 rounded-xl hover:bg-primary/10"
            type="button"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-300 drop-shadow-md">
            <img src={storeLogo || logoFull} alt={storeName || "GK Orders"} className="h-9 w-auto object-contain rounded-md" />
          </div>

          <div className="w-10" />
        </div>

        {onNewOrder && (
          <div className="px-4 pb-3">
            <button
              onClick={onNewOrder}
              type="button"
              className="w-full py-3 rounded-xl bg-primary text-black font-black uppercase tracking-wider text-sm hover:opacity-90 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:-translate-y-0.5 active:scale-95"
            >
              + Abrir pedido
            </button>
          </div>
        )}
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setDrawerOpen(false)} />

          <nav className="relative w-72 bg-[#0a0a0a] border-r border-white/10 h-full flex flex-col shadow-2xl animate-slide-right">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <img src={storeLogo || logoFull} alt={storeName || "GK Orders"} className="h-8 w-auto drop-shadow-md object-contain rounded-md" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-primary hover:bg-primary/10 transition-all hover:rotate-90"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-white/10 relative overflow-hidden bg-gradient-to-b from-primary/5 to-transparent">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Usuário logado</p>
                <p className="font-black text-xl text-white truncate drop-shadow-sm">{user?.name ?? 'Usuário'}</p>
                {storeName && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg shadow-inner">
                    <Store className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary truncate max-w-[180px]">{storeName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 py-4 overflow-y-auto space-y-1">
              {navItems.map((item) => {
                const isActive = currentPath === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className={`group flex items-center gap-3 px-6 py-3.5 text-sm font-bold transition-all hover:bg-white/5 hover:pl-8 ${
                      isActive ? 'bg-primary/10 text-primary border-r-4 border-primary shadow-[inset_4px_0_0_rgba(255,106,0,0)]' : 'text-gray-400'
                    }`}
                  >
                    <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10 bg-black/40">
              <button
                onClick={handleLogout}
                type="button"
                className="flex items-center justify-center gap-3 w-full px-4 py-3.5 text-sm font-black text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all group"
              >
                <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                Sair do Sistema
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
