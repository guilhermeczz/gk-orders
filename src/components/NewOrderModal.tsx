import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { OrderItem } from '@/lib/types';
import { toast } from 'sonner';
import { X, Search, Plus, Minus, ArrowLeft, ShoppingBag, Info } from 'lucide-react';
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
}

export function NewOrderModal({
  open,
  onClose,
  editOrderId,
  appendOrderId,
  initialCustomerName,
  initialCart,
  initialNotes,
  appendBaseNotes,
}: NewOrderModalProps) {
  const { products, categories, addOrder, updateOrder, appendItemsToOrder } = useAppStore();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderType, setOrderType] = useState<'Local' | 'Delivery' | 'Retirada' | ''>('');
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    setCustomerName(initialCustomerName ?? '');

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

    setNotes(parsedNotes);
    setOrderType(parsedType);
    setCart(appendOrderId ? {} : initialCart ?? {});
    setSearch('');
    setShowSummary(false);
  }, [open, editOrderId, appendOrderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [showSummary]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p: any) => {
      const catId = p.categoryId;
      const cat: any = categories.find((c: any) => String(c.id) === String(catId));
      const pName = String(p.name || '').toLowerCase();
      const cName = String(cat?.name || '').toLowerCase();
      return pName.includes(q) || cName.includes(q);
    });
  }, [products, search, categories]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce((acc, p: any) => {
      const catId = String(p.categoryId || 'geral');
      if (!acc[catId]) acc[catId] = [];
      acc[catId].push(p);
      return acc;
    }, {} as Record<string, typeof filteredProducts>);
  }, [filteredProducts]);

  const total = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const p: any = products.find((prod: any) => String(prod.id) === String(id));
      if (!p) return sum;
      return sum + Number(p.price || 0) * qty;
    }, 0);
  }, [cart, products]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const p: any = products.find((prod: any) => String(prod.id) === String(id));
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
    if (!customerName.trim()) return toast.error('Informe o nome do cliente.');
    if (cartItems.length === 0) return toast.error('O carrinho está vazio.');
    if (!orderType) return toast.error('Selecione se o pedido é Local, Delivery ou Retirada.');

    setLoading(true);
    try {
      const finalNotes = `[${orderType.toUpperCase()}] ${notes}`.trim();

      if (appendOrderId) {
        await appendItemsToOrder(appendOrderId, cartItems, finalNotes);
      } else if (editOrderId) {
        await updateOrder(editOrderId, customerName.trim(), cartItems, finalNotes);
      } else {
        await addOrder(
          customerName.trim(),
          cartItems,
          finalNotes,
          user?.name || user?.username || 'Operador'
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

  const getCategoryLabel = (catId: string) => {
    const cat: any = categories.find((c: any) => String(c.id) === String(catId));
    const nomeCategoria = cat?.name || 'Geral';
    const emoji = cat?.emoji ? `${cat.emoji} ` : '';
    return `${emoji}${nomeCategoria}`;
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const title = appendOrderId
    ? 'Adicionar Itens ao Pedido'
    : editOrderId
      ? 'Editando Pedido'
      : 'Montar Novo Pedido';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-5xl h-full max-h-[90vh] bg-background rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-border/50">
        <div className="flex justify-between items-center px-6 py-5 border-b border-border/50 bg-card/50 backdrop-blur-sm z-10">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground tracking-tight">
            {showSummary && (
              <button
                onClick={() => setShowSummary(false)}
                className="mr-2 p-2 hover:bg-muted rounded-full transition-all hover:-translate-x-1"
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
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth custom-scrollbar">
          {showSummary ? (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm">
                <h3 className="font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" /> 1. Tipo de Atendimento <span className="text-destructive">*</span>
                </h3>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {['Local', 'Delivery', 'Retirada'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type as any)}
                      className={`py-4 rounded-2xl border-2 font-bold transition-all duration-300 ${
                        orderType === type
                          ? 'bg-primary/10 border-primary text-primary shadow-[0_4px_15px_rgba(255,106,0,0.15)] scale-[1.02] transform'
                          : 'bg-background border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm">
                <h3 className="font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-sm">
                  2. Cliente e Observações
                </h3>

                <p className="text-sm text-muted-foreground mb-1">Nome na comanda/mesa:</p>
                <p className="font-bold text-xl text-foreground bg-background p-4 rounded-xl border border-border/40">
                  {customerName}
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
                  3. Conferência de Itens
                </h3>

                <div className="space-y-2.5">
                  {cartItems.map((item, i) => (
                    <div
                      key={i}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 bg-card p-5 sm:p-6 rounded-3xl border border-border/60 shadow-sm">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                    Cliente ou Mesa
                  </label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Mesa 04 ou João"
                    className="w-full bg-white text-black placeholder:text-gray-400 border border-border/60 rounded-2xl px-5 py-4 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-[15px]"
                  />
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
                {Object.entries(groupedProducts).map(([catId, prods]: any) => (
                  <div key={catId} className="space-y-4">
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/80"></div>
                      <h3 className="font-bold text-lg text-primary px-4 py-1.5 bg-primary/5 border border-primary/20 rounded-full tracking-tight shadow-sm">
                        {getCategoryLabel(catId)}
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/80"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {prods.map((p: any) => {
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
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <span className="w-4 text-center font-bold text-[15px]">{qty}</span>

                              <button
                                onClick={() => updateQty(safeId, 1)}
                                className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 transition-transform active:scale-95"
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
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-border/50 bg-card/80 backdrop-blur-md z-10">
          {!showSummary ? (
            <button
              onClick={() => setShowSummary(true)}
              className="w-full py-4 sm:py-5 bg-primary text-primary-foreground font-black rounded-2xl text-[17px] sm:text-lg shadow-lg hover:shadow-[0_8px_25px_rgba(255,106,0,0.3)] transition-all duration-300 hover:-translate-y-1 active:scale-95 flex justify-between px-6 sm:px-8 items-center"
            >
              <span>Avançar para Revisão</span>
              <span className="bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">{formatMoney(total)}</span>
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading || cartItems.length === 0}
              className="w-full py-4 sm:py-5 bg-green-600 text-white font-black rounded-2xl text-[17px] sm:text-lg shadow-lg hover:bg-green-500 hover:shadow-[0_8px_25px_rgba(34,197,94,0.3)] transition-all duration-300 hover:-translate-y-1 active:scale-95 flex justify-between px-6 sm:px-8 items-center disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <span>{loading ? 'Enviando...' : appendOrderId ? 'Confirmar Adicional' : 'Confirmar e Enviar'}</span>
              <span className="bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">{formatMoney(total)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}