import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { OrderItem, Product, Mesa } from '@/lib/types';
import { toast } from 'sonner';
import {
  ChevronDown,
  Store,
  X,
  Search,
  Plus,
  Minus,
  ArrowLeft,
  ShoppingBag,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  editOrderId?: string | null;
  appendOrderId?: string | null;
  initialCustomerName?: string;
  initialCart?: Record<string, number>;
  initialNotes?: string;
  appendBaseNotes?: string;
  mesaId?: string | null;
  mesaNumero?: number | null;
  forceOrderType?: 'Local' | 'Retirada';
  hideOrderTypeSelector?: boolean;
}

const categoryDisplayOrder = [
  'Lanches de Hambúrguer',
  'Lanches de Frango',
  'Lanches de Calabresa',
  'Lanches Leves',
  'Lanches Especiais',
  'Hot Dog',
  'Adicionais',
  'Bebidas',
];

export function NewOrderModal({
  open,
  onClose,
  editOrderId,
  forceOrderType,
  hideOrderTypeSelector,
  appendOrderId,
  initialCustomerName,
  initialCart,
  initialNotes,
  appendBaseNotes,
  mesaId,
  mesaNumero,
}: NewOrderModalProps) {
  const { products, categories, mesas, addOrder, updateOrder, appendItemsToOrder } = useAppStore();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderType, setOrderType] = useState<'Local' | 'Delivery' | 'Retirada' | ''>('');
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedMesaId, setSelectedMesaId] = useState<string>('');
  const [mesaDropdownAberto, setMesaDropdownAberto] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
  customerName?: boolean;
  mesa?: boolean;
  cart?: boolean;
}>({});


  const scrollRef = useRef<HTMLDivElement>(null);

  const isAppending = !!appendOrderId;
  const isEditing = !!editOrderId;
  const isMesaFlow = !!mesaId || !!mesaNumero;
  const isForcedPickup = forceOrderType === 'Retirada';
  const isTopAvulsoFlow = !isAppending && !isEditing && !isMesaFlow && !isForcedPickup;
 

  const mesasDisponiveis = useMemo(() => {
    return (mesas ?? [])
      .filter((mesa) => mesa.ativa !== false)
      .sort((a, b) => Number(a.numero) - Number(b.numero));
  }, [mesas]);

  const selectedMesa = useMemo(() => {
    if (mesaId) {
      return mesasDisponiveis.find((m) => String(m.id) === String(mesaId)) ?? null;
    }

    if (selectedMesaId) {
      return mesasDisponiveis.find((m) => String(m.id) === String(selectedMesaId)) ?? null;
    }

    return null;
  }, [mesaId, mesasDisponiveis, selectedMesaId]);

   const shouldShowTypeStep = !isMesaFlow && !selectedMesa;

  useEffect(() => {
    if (!open) return;

    const fallbackCustomer =
      initialCustomerName ??
      (mesaNumero ? `Mesa ${mesaNumero}` : '');

    setCustomerName(fallbackCustomer);

    const sourceNotes = appendOrderId ? appendBaseNotes ?? '' : initialNotes ?? '';
    let parsedNotes = appendOrderId ? '' : initialNotes ?? '';
    let parsedType: 'Local' | 'Delivery' | 'Retirada' | '' = '';

    if (sourceNotes.includes('[LOCAL]')) parsedType = 'Local';
    else if (sourceNotes.includes('[DELIVERY]')) parsedType = 'Delivery';
    else if (sourceNotes.includes('[RETIRADA]')) parsedType = 'Retirada';

    if (!appendOrderId) {
      if (parsedNotes.includes('[LOCAL]')) parsedNotes = parsedNotes.replace('[LOCAL]', '').trim();
      else if (parsedNotes.includes('[DELIVERY]')) parsedNotes = parsedNotes.replace('[DELIVERY]', '').trim();
      else if (parsedNotes.includes('[RETIRADA]')) parsedNotes = parsedNotes.replace('[RETIRADA]', '').trim();
    }

    if (forceOrderType) {
      parsedType = forceOrderType;
    } else if (mesaId || mesaNumero) {
      parsedType = 'Local';
    }

    setNotes(parsedNotes);
    setOrderType(parsedType);
    setCart(appendOrderId ? {} : initialCart ?? {});
    setSearch('');
    setShowSummary(false);
    setMesaDropdownAberto(false);
    setFieldErrors({});

    if (mesaId) {
      setSelectedMesaId(String(mesaId));
    } else {
      setSelectedMesaId('');
    }
  }, [
    open,
    editOrderId,
    appendOrderId,
    initialCustomerName,
    initialCart,
    initialNotes,
    appendBaseNotes,
    mesaNumero,
    mesaId,
    forceOrderType,
  ]);

  useEffect(() => {
    if (selectedMesa && isTopAvulsoFlow) {
      setCustomerName(`Mesa ${selectedMesa.numero}`);
      setOrderType('Local');
    }
  }, [selectedMesa, isTopAvulsoFlow]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }

    if (showSummary) {
      setMesaDropdownAberto(false);
    }
  }, [showSummary]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return products.filter((p: Product) => {
      const category = categories.find((c: any) => String(c.id) === String(p.categoryId));
      const categoryName = String(category?.name || '').toLowerCase();

      if (!q) return p.active !== false;

      return (
        p.active !== false &&
        (
          String(p.name || '').toLowerCase().includes(q) ||
          categoryName.includes(q)
        )
      );
    });
  }, [products, categories, search]);

  const groupedProducts = useMemo(() => {
    const grouped = categories.reduce<Record<string, Product[]>>((acc, category: any) => {
      const categoryName = String(category.name || '').trim();

      const items = filteredProducts
        .filter((p) => String(p.categoryId) === String(category.id))
        .sort((a, b) => {
          if (a.price !== b.price) return a.price - b.price;
          return a.name.localeCompare(b.name, 'pt-BR');
        });

      if (items.length > 0 && categoryName) {
        acc[categoryName] = items;
      }

      return acc;
    }, {});

    const orderedCategoryNames = categoryDisplayOrder.filter(
      (categoryName) => grouped[categoryName]?.length > 0
    );

    const extraCategoryNames = Object.keys(grouped)
      .filter((categoryName) => !categoryDisplayOrder.includes(categoryName))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return [...orderedCategoryNames, ...extraCategoryNames].map(
      (categoryName) => [categoryName, grouped[categoryName]] as const
    );
  }, [categories, filteredProducts]);

  const total = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = products.find((prod: any) => String(prod.id) === String(id));
      if (!p) return sum;
      return sum + Number(p.price || 0) * qty;
    }, 0);
  }, [cart, products]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const p = products.find((prod: any) => String(prod.id) === String(id));
        if (!p) return null;

        return {
          productId: String(id),
          productName: p.name,
          quantity,
          unitPrice: Number(p.price || 0),
        };
      })
      .filter(Boolean) as OrderItem[];
  }, [cart, products]);

  const updateQty = (productId: string | number, delta: number) => {
    const safeId = String(productId);

    setCart((prev) => {
      const next = (prev[safeId] || 0) + delta;

      if (next <= 0) {
        const { [safeId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [safeId]: next };
    });
  };

  const handleConfirm = async () => {
    if (isTopAvulsoFlow && !selectedMesa) {
      toast.error('Selecione uma mesa criada para abrir o pedido.');
      return;
    }

    if (isForcedPickup && !customerName.trim()) {
  toast.error('Informe o nome do cliente para retirada.');
  return;
}

if (!isForcedPickup && !isMesaFlow && !isTopAvulsoFlow && !customerName.trim()) {
  toast.error('Informe o nome do cliente ou mesa.');
  return;
}

    if (cartItems.length === 0) {
      toast.error('O carrinho está vazio.');
      return;
    }

    const resolvedOrderType =
      orderType || (isMesaFlow || selectedMesa ? 'Local' : isForcedPickup ? 'Retirada' : '');

    if (!resolvedOrderType) {
      toast.error('Selecione o tipo do pedido.');
      return;
    }

    setLoading(true);

    try {
      const safeCustomerName =
        customerName.trim() ||
        (isForcedPickup ? 'Retirada' : selectedMesa ? `Mesa ${selectedMesa.numero}` : 'Pedido');

      const finalNotes = `[${resolvedOrderType.toUpperCase()}] ${notes}`.trim();

      if (appendOrderId) {
        await appendItemsToOrder(appendOrderId, cartItems, finalNotes);
      } else if (editOrderId) {
        await updateOrder(editOrderId, safeCustomerName, cartItems, finalNotes);
      } else {
        await addOrder(
          safeCustomerName,
          cartItems,
          finalNotes,
          user?.name || user?.username || 'Operador',
          selectedMesa?.id ?? mesaId ?? null
        );
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar pedido.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);

  const title = appendOrderId
    ? 'Adicionar Itens ao Pedido'
    : editOrderId
      ? 'Editando Pedido'
      : mesaNumero
        ? `Abrir Mesa ${mesaNumero}`
        : isForcedPickup
          ? 'Novo Pedido de Retirada'
          : 'Montar Novo Pedido';

  const canProceed =
  cartItems.length > 0 &&
  (!isForcedPickup || customerName.trim().length > 0) &&
  (
    isAppending ||
    isEditing ||
    isMesaFlow ||
    isForcedPickup ||
    !!selectedMesa
  );
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-5xl h-full max-h-[90vh] bg-background rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-border/50">
        <div className="flex justify-between items-center px-6 py-5 border-b border-border/50 bg-card/50 backdrop-blur-sm z-10">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground tracking-tight">
            {showSummary && (
              <button
                onClick={() => setShowSummary(false)}
                className="mr-2 p-2 hover:bg-muted rounded-full transition-all hover:-translate-x-1"
                type="button"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="p-2.5 bg-primary/10 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>

            {title}
          </h2>

          <button
            onClick={onClose}
            className="p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all hover:rotate-90"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth custom-scrollbar"
        >
          {showSummary ? (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              {shouldShowTypeStep && (
                <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm">
                  <h3 className="font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                    <Info className="w-4 h-4" /> 1. Tipo de Atendimento
                  </h3>

                  {hideOrderTypeSelector ? (
                    <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 text-center">
                      <span className="font-black text-primary">{orderType || forceOrderType}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {['Local', 'Retirada'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setOrderType(type as 'Local' | 'Retirada')}
                          disabled={isTopAvulsoFlow}
                          className={`py-4 rounded-2xl border-2 font-bold transition-all duration-300 ${
                            orderType === type
                              ? 'bg-primary/10 border-primary text-primary shadow-[0_4px_15px_rgba(255,106,0,0.15)] scale-[1.02] transform'
                              : 'bg-background border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
                          } ${isTopAvulsoFlow ? 'opacity-60 cursor-not-allowed' : ''}`}
                          type="button"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}

                  {isTopAvulsoFlow && (
                    <p className="mt-3 text-xs text-amber-400">
                      Pedidos abertos por aqui são sempre vinculados a uma mesa criada. Para retirada, use a aba principal de retirada.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm">
                <h3 className="font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-sm">
                  {isMesaFlow || selectedMesa
                    ? '1. Mesa'
                    : isForcedPickup
                      ? '2. Cliente'
                      : '2. Cliente ou Mesa'}
                </h3>

                <p className="text-sm text-muted-foreground mb-1">
                  {isForcedPickup
                    ? 'Cliente da retirada:'
                    : isMesaFlow || selectedMesa
                      ? 'Mesa selecionada:'
                      : 'Nome na comanda:'}
                </p>

                <p className="font-bold text-xl text-foreground bg-background p-4 rounded-xl border border-border/40">
                  {customerName || (isForcedPickup ? 'Retirada' : 'Não informado')}
                </p>

                {notes && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-1">Anotações da Cozinha:</p>
                    <p className="text-[15px] font-medium italic text-foreground bg-muted/50 p-4 rounded-xl border-l-4 border-primary">
                      {notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm">
                <h3 className="font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-sm">
                  {isMesaFlow || selectedMesa ? '2. Conferência de Itens' : '3. Conferência de Itens'}
                </h3>

                <div className="space-y-2.5">
                  {cartItems.map((item, i) => (
                    <div
                      key={`${item.productId}-${i}`}
                      className="flex justify-between items-center p-4 bg-background border border-border/40 rounded-2xl hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-primary bg-primary/10 px-2 py-1 rounded-lg min-w-[36px] text-center">
                          {item.quantity}x
                        </span>
                        <span className="font-semibold text-[15px]">{item.productName}</span>
                      </div>

                      <span className="font-medium text-muted-foreground">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              {isTopAvulsoFlow && mesasDisponiveis.length === 0 ? (
                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-sm mb-8">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-lg font-black text-amber-300">
                        Nenhuma mesa cadastrada
                      </p>
                      <p className="text-sm text-amber-100/80 mt-1">
                        Antes de abrir um pedido, crie pelo menos uma mesa na tela principal.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 bg-card p-5 sm:p-6 rounded-3xl border border-border/60 shadow-sm">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                        {isTopAvulsoFlow ? 'Selecionar Mesa' : isForcedPickup ? 'Cliente da retirada' : 'Cliente ou Mesa'}
                      </label>

                      {isTopAvulsoFlow ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMesaDropdownAberto((prev) => !prev)}
                            className={`
                              w-full min-h-[58px]
                              flex items-center justify-between gap-4
                              rounded-2xl
                              border
                              px-5 py-4
                              text-left
                              outline-none
                              transition-all duration-200
                              bg-[#111111]/95
                              text-white
                              shadow-[0_0_28px_rgba(255,106,0,0.08)]
                              ${
  fieldErrors.mesa
    ? 'border-red-500 ring-4 ring-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.18)]'
    : mesaDropdownAberto
      ? 'border-primary ring-4 ring-primary/10 shadow-[0_0_34px_rgba(255,106,0,0.18)]'
      : 'border-border/60 hover:border-primary/60 hover:shadow-[0_0_30px_rgba(255,106,0,0.12)]'
}
                            `}
                          >
                            <span
                              className={`truncate text-[15px] font-semibold ${
                                selectedMesa ? 'text-white' : 'text-zinc-300'
                              }`}
                            >
                              {selectedMesa
                                ? `Mesa ${selectedMesa.numero}${selectedMesa.garcomNome ? ` • ${selectedMesa.garcomNome}` : ''}`
                                : 'Selecione uma mesa criada'}
                            </span>

                            <ChevronDown
                              className={`h-5 w-5 shrink-0 text-primary transition-transform duration-200 ${
                                mesaDropdownAberto ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {mesaDropdownAberto && (
                            <div
                              className="
                                absolute left-0 right-0 top-[66px] z-[9999]
                                overflow-hidden
                                rounded-2xl
                                border border-primary/80
                                bg-[#101010]
                                shadow-[0_20px_55px_rgba(0,0,0,0.78),0_0_34px_rgba(255,106,0,0.20)]
                              "
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMesaId('');
                                  setMesaDropdownAberto(false);
                                }}
                                className="
                                  flex w-full items-center gap-3
                                  px-5 py-4
                                  text-left
                                  text-primary
                                  transition-colors
                                  bg-primary/10
                                  hover:bg-primary/15
                                "
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/60 text-primary">
                                  <Store className="h-4 w-4" />
                                </span>
                                <span className="truncate text-[15px] font-bold">
                                  Selecione uma mesa criada
                                </span>
                              </button>

                              {mesasDisponiveis.map((mesa: Mesa) => {
                                const mesaAtiva = String(selectedMesaId) === String(mesa.id);

                                return (
                                  <button
                                    key={mesa.id}
                                    type="button"
                                    onClick={() => {
                                    setSelectedMesaId(String(mesa.id));
                                    setMesaDropdownAberto(false);
                                    setFieldErrors((prev) => ({ ...prev, mesa: false }));
                                    }}

                                    
                                    className={`
                                      flex w-full items-center gap-3
                                      px-5 py-4
                                      text-left
                                      transition-colors
                                      hover:bg-white/[0.06]
                                      ${mesaAtiva ? 'bg-primary/15 text-primary' : 'text-white'}
                                    `}
                                    
                                  >
                                    <span
                                      className={`
                                        flex h-8 w-8 shrink-0 items-center justify-center
                                        rounded-lg border
                                        ${
                                          mesaAtiva
                                            ? 'border-primary/80 text-primary'
                                            : 'border-white/25 text-zinc-400'
                                        }
                                      `}
                                    >
                                      <Store className="h-4 w-4" />
                                    </span>

                                    <span className="truncate text-[15px] font-bold">
                                      Mesa {mesa.numero}{mesa.garcomNome ? ` • ${mesa.garcomNome}` : ''}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {fieldErrors.mesa && (
  <p className="mt-2 text-xs font-bold text-red-500">
    Selecione uma mesa antes de avançar.
  </p>
)}
                        </div>
                      ) : (
                        <input
  value={customerName}
  onChange={(e) => {
    setCustomerName(e.target.value);

    if (fieldErrors.customerName && e.target.value.trim()) {
      setFieldErrors((prev) => ({ ...prev, customerName: false }));
    }
  }}
  disabled={!!mesaNumero}
  placeholder={
    isForcedPickup
      ? 'Nome do cliente da retirada...'
      : mesaNumero
        ? `Mesa ${mesaNumero}`
        : 'Nome ou mesa...'
  }
  className={`w-full bg-white text-black placeholder:text-gray-400 border rounded-2xl px-5 py-4 outline-none transition-all font-medium text-[15px] disabled:opacity-70 ${
    fieldErrors.customerName
      ? 'border-red-500 ring-4 ring-red-500/10 focus:border-red-500'
      : 'border-border/60 focus:border-primary focus:ring-4 focus:ring-primary/10'
  }`}
/>
                      )}
                      {fieldErrors.customerName && (
  <p className="mt-2 text-xs font-bold text-red-500">
    O nome do cliente é obrigatório para retirada.
  </p>
)}

                      {isTopAvulsoFlow && selectedMesa && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Pedido será aberto na <span className="font-bold">Mesa {selectedMesa.numero}</span>.
                        </p>
                      )}

                      {isForcedPickup && (
  <p className="mt-2 text-xs text-muted-foreground">
    Informe o nome do cliente para identificar a retirada.
  </p>
)}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                        Pesquisar Cardápio
                      </label>

                      <div className="relative group">
                        <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar lanche, bebida..."
                          className="w-full bg-white text-black placeholder:text-gray-400 border border-border/60 rounded-2xl pl-12 pr-5 py-4 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-[15px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {groupedProducts.map(([categoryName, prods]) => (
                      <div key={categoryName} className="space-y-4">
                        <div className="flex items-center gap-4 py-2">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/80" />
                          <h3 className="font-bold text-lg text-primary px-4 py-1.5 bg-primary/5 border border-primary/20 rounded-full tracking-tight shadow-sm">
                            {categoryName}
                          </h3>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/80" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {prods.map((p) => {
                            const safeId = String(p.id);
                            const qty = cart[safeId] || 0;
                            const pName = p.name;
                            const pPrice = Number(p.price || 0);

                            return (
                              <div
                                key={safeId}
                                className="flex justify-between items-center p-4 bg-card border border-border/50 rounded-2xl transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 group"
                              >
                                <div className="flex flex-col gap-1 pr-3">
                                  <span className="font-semibold text-[15px] leading-tight text-foreground group-hover:text-primary transition-colors">
                                    {pName}
                                  </span>
                                  <span className="text-[13px] font-medium text-muted-foreground">
                                    {formatMoney(pPrice)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 bg-background border border-border/40 p-1.5 rounded-2xl shadow-sm">
                                  <button
                                    onClick={() => updateQty(safeId, -1)}
                                    className="w-8 h-8 flex items-center justify-center bg-muted/50 rounded-xl hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    type="button"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>

                                  <span className="w-4 text-center font-bold text-[15px]">{qty}</span>

                                  <button
                                    onClick={() => updateQty(safeId, 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 transition-transform active:scale-95"
                                    type="button"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 bg-card p-5 sm:p-6 rounded-3xl border border-border/60 shadow-sm">
                    <label className="text-xs font-bold text-muted-foreground mb-3 block uppercase tracking-wider">
                      Anotações para a Cozinha
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: sem cebola, sem molho..."
                      className="w-full bg-white text-black placeholder:text-gray-400 border border-border/60 rounded-2xl px-5 py-4 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all h-28 resize-none font-medium text-[15px]"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-border/50 bg-card/80 backdrop-blur-md z-10">
          {!showSummary ? (
            <button
onClick={() => {
  const nextErrors: {
    customerName?: boolean;
    mesa?: boolean;
    cart?: boolean;
  } = {};

  if (isTopAvulsoFlow && !selectedMesa) {
    nextErrors.mesa = true;
  }

  if (isForcedPickup && !customerName.trim()) {
    nextErrors.customerName = true;
  }

  if (cartItems.length === 0) {
    nextErrors.cart = true;
  }

  if (Object.keys(nextErrors).length > 0) {
    setFieldErrors(nextErrors);

    if (nextErrors.customerName) {
      toast.error('Informe o nome do cliente para retirada.');
      return;
    }

    if (nextErrors.mesa) {
      toast.error('Selecione uma mesa criada para abrir o pedido.');
      return;
    }

    if (nextErrors.cart) {
      toast.error('Adicione pelo menos um item ao pedido.');
      return;
    }
  }

  setFieldErrors({});
  setShowSummary(true);
}}              
disabled={cartItems.length === 0}
              className="w-full py-4 sm:py-5 bg-primary text-primary-foreground font-black rounded-2xl text-[17px] sm:text-lg shadow-lg hover:shadow-[0_8px_25px_rgba(255,106,0,0.3)] transition-all duration-300 hover:-translate-y-1 active:scale-95 flex justify-between px-6 sm:px-8 items-center disabled:opacity-50 disabled:hover:translate-y-0"
              type="button"
            >
              <span>Avançar para Revisão</span>
              <span className="bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                {formatMoney(total)}
              </span>
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading || cartItems.length === 0}
              className="w-full py-4 sm:py-5 bg-green-600 text-white font-black rounded-2xl text-[17px] sm:text-lg shadow-lg hover:bg-green-500 hover:shadow-[0_8px_25px_rgba(34,197,94,0.3)] transition-all duration-300 hover:-translate-y-1 active:scale-95 flex justify-between px-6 sm:px-8 items-center disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              type="button"
            >
              <span>
                {loading
                  ? 'Enviando...'
                  : appendOrderId
                    ? 'Confirmar Adicional'
                    : 'Confirmar e Enviar'}
              </span>
              <span className="bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                {formatMoney(total)}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}