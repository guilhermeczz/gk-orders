import { useMemo, useState } from 'react';
import {
  Menu,
  X,
  Home,
  Package,
  Users,
  BarChart3,
  LogOut,
  Wallet,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import logoFull from '@/assets/logo-full.png';

type NavItem = {
  to:
    | '/dashboard'
    | '/paid-orders'
    | '/products'
    | '/users'
    | '/reports'
    | '/cash-register'
    | '/developer';
  label: string;
  icon: any;
};

const baseNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Início', icon: Home },
  { to: '/paid-orders', label: 'Pedidos Pagos', icon: CheckCircle2 },
  { to: '/products', label: 'Produtos', icon: Package },
  { to: '/users', label: 'Usuários', icon: Users },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/cash-register', label: 'Controle de Caixa', icon: Wallet },
];

export function AppHeader({ onNewOrder }: { onNewOrder?: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isDeveloper =
    String(user?.username || '').toLowerCase() === 'dev' ||
    String(user?.name || '').toLowerCase() === 'desenvolvedor';

  const navItems = useMemo(() => {
    const items = [...baseNavItems];

    if (isDeveloper) {
      items.push({
        to: '/developer',
        label: 'Painel do Desenvolvedor',
        icon: ShieldCheck,
      });
    }

    return items;
  }, [isDeveloper]);

  const handleLogout = async () => {
    try {
      await logout?.();
      toast.success('Você saiu do sistema.');
      setDrawerOpen(false);
      navigate({ to: '/' });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sair do sistema.');
    }
  };

  const currentPath = location.pathname?.replace(/\/$/, '') || '';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/70 backdrop-blur-md border-b border-border transition-all print:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
            type="button"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-300">
            <img src={logoFull} alt="GK Orders" className="h-10 w-auto" />
          </div>

          <div className="w-10" />
        </div>

        {onNewOrder && (
          <div className="px-4 pb-3">
            <button
              onClick={onNewOrder}
              type="button"
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-[0_0_15px_rgba(255,106,0,0.4)] hover:-translate-y-0.5 active:scale-95"
            >
              + Abrir pedido
            </button>
          </div>
        )}
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          <nav className="relative w-72 bg-card border-r border-border h-full flex flex-col shadow-2xl animate-slide-right">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <img src={logoFull} alt="GK Orders" className="h-8 w-auto" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 hover:text-primary transition-all hover:rotate-90"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 border-b border-border bg-background/50">
              <p className="text-sm text-muted-foreground mb-1">Usuário logado</p>
              <p className="font-bold text-lg text-primary">
                {user?.name ?? 'Usuário'}
              </p>
            </div>

            <div className="flex-1 py-4 overflow-y-auto space-y-1">
              {navItems.map((item) => {
                const isActive = currentPath === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className={`group flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all hover:bg-muted hover:pl-8 ${
                      isActive
                        ? 'bg-primary/10 text-primary border-r-4 border-primary'
                        : 'text-foreground'
                    }`}
                  >
                    <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t border-border bg-background/50">
              <button
                onClick={handleLogout}
                type="button"
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive hover:text-white rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sair do Sistema
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}