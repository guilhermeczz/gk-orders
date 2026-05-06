import { useState } from 'react';
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
  Store,
  Repeat,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { useCurrentStoreInfo } from '@/lib/current-store-info';
import { toast } from 'sonner';

const navItems = [
  { to: '/dashboard' as const, label: 'Início (Mesas & Retiradas)', icon: Home },
  { to: '/paid-orders' as const, label: 'Pedidos Pagos', icon: CheckCircle2 },
  { to: '/products' as const, label: 'Produtos', icon: Package },
  { to: '/users' as const, label: 'Usuários', icon: Users },
  { to: '/reports' as const, label: 'Relatórios & Arquivados', icon: BarChart3 },
  { to: '/cash-register' as const, label: 'Controle de Caixa', icon: Wallet },
];

const developerNavItem = {
  to: '/developer' as const,
  label: 'Painel do Desenvolvedor',
  icon: ShieldCheck,
};

export function AppHeader({ onNewOrder }: { onNewOrder?: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { storeInfo, loadingStore } = useCurrentStoreInfo();

  const isDeveloper =
    String(user?.username || '').toLowerCase() === 'dev' ||
    String(user?.name || '').toLowerCase() === 'desenvolvedor';

  const menuItems = isDeveloper ? [developerNavItem, ...navItems] : navItems;

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

  const currentPath = location.pathname?.replace(/\/$/, '');

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border transition-all print:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
            type="button"
          >
            <Menu className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' })}
            className="flex items-center gap-2 transition-transform duration-300 hover:scale-105"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-[0_0_20px_rgba(255,106,0,0.25)]">
              GK
            </div>

            <div className="text-left leading-none">
              <p className="text-sm font-black text-foreground">GK Orders</p>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Multi Store POS
              </p>
            </div>
          </button>

          <div className="w-10" />
        </div>

        <div className="px-4 pb-3">
          <div className="mb-3 rounded-2xl border border-border bg-card/80 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Store className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Loja atual
                  </p>

                  <p className="truncate text-sm font-black text-foreground">
                    {loadingStore
                      ? 'Carregando...'
                      : storeInfo?.nome || 'Loja não selecionada'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {storeInfo && (
                  <>
                    <span
                      className={`hidden rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider sm:inline-flex ${
                        storeInfo.ativa
                          ? 'border-green-500/30 bg-green-500/10 text-green-500'
                          : 'border-red-500/30 bg-red-500/10 text-red-500'
                      }`}
                    >
                      {storeInfo.ativa ? 'Ativa' : 'Inativa'}
                    </span>

                    <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary sm:inline-flex">
                      {storeInfo.plano}
                    </span>
                  </>
                )}

                {isDeveloper && (
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/developer' })}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-black text-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    Trocar
                  </button>
                )}
              </div>
            </div>
          </div>

          {onNewOrder && (
            <button
              onClick={onNewOrder}
              type="button"
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-[0_0_15px_rgba(255,106,0,0.4)] hover:-translate-y-0.5 active:scale-95"
            >
              + Abrir pedido em mesa
            </button>
          )}
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          <nav className="relative w-72 bg-card border-r border-border h-full flex flex-col shadow-2xl animate-slide-right">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                  GK
                </div>

                <div className="leading-none">
                  <p className="text-sm font-black text-foreground">GK Orders</p>
                  <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Multi Store POS
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 hover:text-primary transition-all hover:rotate-90"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 border-b border-border bg-background/50">
              <p className="text-sm text-muted-foreground mb-1">Operador Logado</p>
              <p className="font-bold text-lg text-primary">
                {user?.name ?? 'Usuário Admin'}
              </p>

              <div className="mt-4 rounded-2xl border border-border bg-background p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Loja atual
                </p>

                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {loadingStore
                    ? 'Carregando...'
                    : storeInfo?.nome || 'Loja não selecionada'}
                </p>

                {storeInfo && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                        storeInfo.ativa
                          ? 'border-green-500/30 bg-green-500/10 text-green-500'
                          : 'border-red-500/30 bg-red-500/10 text-red-500'
                      }`}
                    >
                      {storeInfo.ativa ? 'Ativa' : 'Inativa'}
                    </span>

                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                      {storeInfo.plano}
                    </span>
                  </div>
                )}

                {isDeveloper && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate({ to: '/developer' });
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary transition hover:bg-primary/20"
                  >
                    <Repeat className="h-4 w-4" />
                    Trocar loja
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 py-4 overflow-y-auto space-y-1">
              {menuItems.map((item) => {
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