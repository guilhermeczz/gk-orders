import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, CalendarDays, Crown, Loader2, PackageSearch, Trophy } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { useAppStore } from '@/lib/store';
import type { Category, Order, Product } from '@/lib/types';

type ProductRanking = {
  productId: string;
  productName: string;
  categoryId: string;
  quantity: number;
  revenue: number;
};

type CategoryRanking = {
  category: Category;
  items: ProductRanking[];
  totalQuantity: number;
  totalRevenue: number;
};

const normalizeText = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isAdditionsCategory = (category: Category) => {
  const name = normalizeText(category.name);
  return name.includes('adicional') || name.includes('adicionais') || name.includes('extra');
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getCurrentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthRange = (monthValue: string) => {
  const [year, month] = monthValue.split('-').map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const formatMonthLabel = (monthValue: string) => {
  const { start } = getMonthRange(monthValue);
  return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export function BestSellersPage() {
  const { categories, products, fetchOrdersByPeriod, lojaAtualId } = useAppStore();
  const [month, setMonth] = useState(getCurrentMonthValue);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lojaAtualId) {
      setOrders([]);
      return;
    }

    const { start, end } = getMonthRange(month);
    let active = true;

    setLoading(true);
    fetchOrdersByPeriod(start, end, { paidOnly: true })
      .then((result) => {
        if (active) setOrders(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchOrdersByPeriod, lojaAtualId, month]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product) => map.set(String(product.id), product));
    return map;
  }, [products]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => !isAdditionsCategory(category)),
    [categories]
  );

  const categoryRankings = useMemo<CategoryRanking[]>(() => {
    const byProduct = new Map<string, ProductRanking>();

    orders.forEach((order) => {
      (order.items ?? []).forEach((item) => {
        const product = productMap.get(String(item.productId));
        if (!product) return;

        const category = categories.find((cat) => String(cat.id) === String(product.categoryId));
        if (!category || isAdditionsCategory(category)) return;

        const current = byProduct.get(String(product.id)) ?? {
          productId: String(product.id),
          productName: product.name || item.productName,
          categoryId: String(product.categoryId),
          quantity: 0,
          revenue: 0,
        };

        const quantity = Number(item.quantity || 0);
        current.quantity += quantity;
        current.revenue += quantity * Number(item.unitPrice || product.price || 0);
        byProduct.set(String(product.id), current);
      });
    });

    return visibleCategories
      .map((category) => {
        const items = Array.from(byProduct.values())
          .filter((item) => String(item.categoryId) === String(category.id))
          .sort((a, b) => {
            if (b.quantity !== a.quantity) return b.quantity - a.quantity;
            if (b.revenue !== a.revenue) return b.revenue - a.revenue;
            return a.productName.localeCompare(b.productName, 'pt-BR');
          });

        return {
          category,
          items,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
          totalRevenue: items.reduce((sum, item) => sum + item.revenue, 0),
        };
      })
      .filter(
        (ranking) =>
          selectedCategoryId === 'all' || String(ranking.category.id) === String(selectedCategoryId)
      );
  }, [categories, orders, productMap, selectedCategoryId, visibleCategories]);

  const monthTotals = useMemo(
    () =>
      categoryRankings.reduce(
        (acc, ranking) => ({
          quantity: acc.quantity + ranking.totalQuantity,
          revenue: acc.revenue + ranking.totalRevenue,
        }),
        { quantity: 0, revenue: 0 }
      ),
    [categoryRankings]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <AppHeader />
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-6">
        <div className="mb-6 flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              to="/dashboard"
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <p className="text-xs font-black uppercase tracking-widest text-primary">
              Ranking mensal
            </p>
            <h1 className="mt-1 text-3xl font-black text-foreground">
              Produtos mais pedidos
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="rounded-xl border border-border bg-card px-4 py-3">
              <span className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> Mês
              </span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value || getCurrentMonthValue())}
                className="w-full bg-transparent text-sm font-black text-foreground outline-none [color-scheme:dark]"
              />
            </label>

            <label className="rounded-xl border border-border bg-card px-4 py-3">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Categoria
              </span>
              <select
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                className="w-full bg-transparent text-sm font-black text-foreground outline-none"
              >
                <option className="bg-[#111]" value="all">Todas as categorias</option>
                {visibleCategories.map((category) => (
                  <option className="bg-[#111]" key={category.id} value={category.id}>
                    {category.emoji ? `${category.emoji} ` : ''}{category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard label="Período" value={formatMonthLabel(month)} />
          <MetricCard label="Itens vendidos" value={String(monthTotals.quantity)} />
          <MetricCard label="Receita dos itens" value={formatMoney(monthTotals.revenue)} />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-bold text-muted-foreground">Carregando ranking do mês...</p>
          </div>
        ) : categoryRankings.length === 0 ? (
          <EmptyState text="Nenhuma categoria cadastrada para exibir." />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {categoryRankings.map((ranking) => (
              <CategoryRankingCard key={ranking.category.id} ranking={ranking} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}

function CategoryRankingCard({ ranking }: { ranking: CategoryRanking }) {
  const champion = ranking.items[0];
  const remainingItems = ranking.items.slice(1, 6);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-primary">
            {ranking.category.emoji ? `${ranking.category.emoji} ` : ''}{ranking.category.name}
          </p>
          <h2 className="mt-1 text-xl font-black text-foreground">Campeão da categoria</h2>
        </div>
        <span className="rounded-lg bg-background px-3 py-2 text-xs font-black text-muted-foreground">
          {ranking.totalQuantity} vendidos
        </span>
      </div>

      {champion ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
            <div className="absolute right-4 top-4 rounded-full bg-yellow-500/20 p-2 text-yellow-300">
              <Crown className="h-7 w-7" />
            </div>
            <div className="pr-16">
              <p className="text-[11px] font-black uppercase tracking-wider text-yellow-300">
                Mais pedido
              </p>
              <h3 className="mt-1 text-2xl font-black text-foreground">{champion.productName}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-background px-3 py-2 text-sm font-black text-foreground">
                  {champion.quantity} vendidos
                </span>
                <span className="rounded-lg bg-background px-3 py-2 text-sm font-black text-foreground">
                  {formatMoney(champion.revenue)}
                </span>
              </div>
            </div>
          </div>

          {remainingItems.length > 0 && (
            <div className="mt-4 space-y-2">
              {remainingItems.map((item, index) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                      {index + 2}
                    </span>
                    <p className="truncate font-bold text-foreground">{item.productName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-foreground">{item.quantity} un.</p>
                    <p className="text-xs font-bold text-muted-foreground">{formatMoney(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState text="Nenhum produto vendido nesta categoria no mês selecionado." compact />
      )}
    </section>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-dashed border-border bg-background text-center ${compact ? 'p-6' : 'p-10'}`}>
      {compact ? (
        <PackageSearch className="mx-auto h-7 w-7 text-muted-foreground" />
      ) : (
        <Trophy className="mx-auto h-9 w-9 text-muted-foreground" />
      )}
      <p className="mt-3 font-bold text-muted-foreground">{text}</p>
    </div>
  );
}
