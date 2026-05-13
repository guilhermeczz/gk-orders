import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Edit2, 
  X, 
  Loader2, 
  Tag, 
  Folder, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Layers
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { AppHeader } from '@/components/AppHeader';

const normalizeText = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isAdditionsCategory = (category: any) => {
  const name = normalizeText(category?.name);
  return name.includes('adicional') || name.includes('adicionais') || name.includes('extra');
};

export function ProductsPage() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    lojaAtualId
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'products' | 'additions' | 'categories'>('products');
  const [showProdForm, setShowProdForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [setor_impressao, setSetorImpressao] = useState('todos');
  const [editProdId, setEditProdId] = useState<string | null>(null);
  const [loadingProd, setLoadingProd] = useState(false);

  const [prodErrors, setProdErrors] = useState<{
    name?: boolean;
    price?: boolean;
    categoryId?: boolean;
  }>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('📦');
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [loadingCat, setLoadingCat] = useState(false);
  const [catErrors, setCatErrors] = useState<{ name?: boolean }>({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [deleteProdTarget, setDeleteProdTarget] = useState<any | null>(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState<any | null>(null);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach(cat => map.set(String(cat.id), cat));
    return map;
  }, [categories]);

  const getCategoryLabel = useCallback((catId: string) => {
    const cat = categoriesMap.get(String(catId));
    return cat ? `${cat.emoji} ${cat.name}` : 'Sem categoria';
  }, [categoriesMap]);

  const additionsCategory = useMemo(() => {
    return categories.find(isAdditionsCategory);
  }, [categories]);

  const visibleCategories = useMemo(() => {
    return categories.filter((category) => !isAdditionsCategory(category));
  }, [categories]);

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories, activeTab, showProdForm, checkScroll]);

  useEffect(() => {
    if (activeTab === 'additions') {
      if (additionsCategory) setCategoryId(additionsCategory.id);
    } else if (activeTab === 'products') {
      const hasVisibleCategorySelected = visibleCategories.some(
        (category) => String(category.id) === String(categoryId)
      );

      if (!hasVisibleCategorySelected && visibleCategories.length > 0) {
        const firstNormalCat = visibleCategories[0];
        if (firstNormalCat) setCategoryId(firstNormalCat.id);
      }
    }
  }, [activeTab, additionsCategory, visibleCategories, categoryId]);

  const handleScrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const handleScrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const printSetores = [
    { value: 'todos', label: 'Todos' },
    { value: 'cozinha', label: 'Cozinha' },
    { value: 'bar', label: 'Bar' },
    { value: 'caixa', label: 'Caixa' },
  ];

  const ensureAdditionsCategory = async () => {
    if (additionsCategory) return String(additionsCategory.id);
    if (!lojaAtualId) throw new Error('Loja não identificada.');

    const { data, error } = await supabase
      .from('categorias')
      .insert([
        {
          loja_id: lojaAtualId,
          nome: 'Adicionais',
          emoji: '+',
        },
      ])
      .select('id')
      .single();

    if (error || !data?.id) {
      throw error ?? new Error('Não foi possível criar a categoria de adicionais.');
    }

    return String(data.id);
  };

  const handleSubmitProduct = async () => {
    if (!lojaAtualId) return toast.error('Loja não identificada. Saia e entre novamente.');

    const numericPrice = parseFloat(String(price).replace(',', '.'));
    const targetCategoryId =
      activeTab === 'additions' ? additionsCategory?.id ?? 'auto' : categoryId;

    const nextErrors = {
      name: !name.trim(),
      price: isNaN(numericPrice) || numericPrice <= 0,
      categoryId: !targetCategoryId,
    };

    setProdErrors(nextErrors);
    if (nextErrors.name) return toast.error('Informe o nome do produto.');
    if (nextErrors.price) return toast.error('Informe um preço válido maior que zero.');
    if (nextErrors.categoryId) return toast.error('Selecione uma categoria.');

    setLoadingProd(true);
    try {
      const resolvedCategoryId =
        activeTab === 'additions' ? await ensureAdditionsCategory() : targetCategoryId;
      const resolvedSetorImpressao = setor_impressao.trim() || 'todos';

      if (editProdId) {
        await updateProduct({
          id: editProdId,
          name: name.trim(),
          price: numericPrice,
          categoryId: resolvedCategoryId,
          setor_impressao: resolvedSetorImpressao,
        });
      } else {
        const success = await addProduct({
          name: name.trim(),
          price: numericPrice,
          categoryId: resolvedCategoryId,
          setor_impressao: resolvedSetorImpressao,
        });

        if (!success) {
          throw new Error("Não foi possível salvar no banco de dados.");
        }
        toast.success(activeTab === 'additions' ? 'Adicional criado com sucesso!' : 'Produto adicionado com sucesso!');
      }

      setName('');
      setPrice('');
      setSetorImpressao('todos');
      setEditProdId(null);
      setShowProdForm(false);
      setProdErrors({});
    } catch (error) {
      toast.error('Erro ao salvar produto. Tente novamente.');
      console.error(error);
    } finally {
      setLoadingProd(false);
    }
  };

  const startEditProduct = (p: any) => {
    setName(p.name);
    setPrice(p.price.toString());
    setCategoryId(p.categoryId);
    setSetorImpressao(p.setor_impressao || 'todos');
    setEditProdId(p.id);
    setShowProdForm(true);
  };

  const cancelEditProduct = () => {
    setName('');
    setPrice('');
    setSetorImpressao('todos');
    setEditProdId(null);
    setShowProdForm(false);
    setProdErrors({});
  };

  const handleSubmitCategory = async () => {
    if (!lojaAtualId) return toast.error('Loja não identificada.');

    const nextErrors = { name: !catName.trim() };
    setCatErrors(nextErrors);
    if (nextErrors.name) return toast.error('Informe o nome da categoria.');

    setLoadingCat(true);
    try {
      if (editCatId) {
        await updateCategory({
          id: editCatId,
          name: catName.trim(),
          emoji: catEmoji,
        });
      } else {
        await addCategory({
          name: catName.trim(),
          emoji: catEmoji,
        });
        toast.success('Categoria adicionada!');
      }

      setCatName('');
      setCatEmoji('📦');
      setEditCatId(null);
      setShowCatForm(false);
      setCatErrors({});
    } catch (error) {
      toast.error('Erro ao processar categoria.');
    } finally {
      setLoadingCat(false);
    }
  };

  const startEditCategory = (cat: any) => {
    setCatName(cat.name);
    setCatEmoji(cat.emoji);
    setEditCatId(cat.id);
    setShowCatForm(true);
  };

  const cancelEditCategory = () => {
    setCatName('');
    setCatEmoji('📦');
    setEditCatId(null);
    setShowCatForm(false);
    setCatErrors({});
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return products.filter(p => {
      const category = categoriesMap.get(String(p.categoryId));
      const isAdicional = category ? isAdditionsCategory(category) : false;
      
      if (activeTab === 'products' && isAdicional) return false;
      if (activeTab === 'additions' && !isAdicional) return false;

      const matchesSearch = p.name.toLowerCase().includes(query);
      const matchesCategory = activeCategoryFilter ? p.categoryId === activeCategoryFilter : true;
      
      return matchesSearch && (activeTab === 'additions' ? true : matchesCategory);
    });
  }, [products, searchQuery, activeCategoryFilter, activeTab, categoriesMap]);

  const inputClass = "w-full px-4 py-3.5 rounded-xl bg-white text-black border border-border placeholder:text-gray-400 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.2)] transition-all font-medium";
  const inputErrorClass = 'border-red-500 ring-4 ring-red-500/10 focus:border-red-500';
  const inputSuccessClass = 'border-green-500/60 focus:border-green-500';

  return (
    <>
      <div className="print:hidden">
        <AppHeader />
      </div>

      <div className="min-h-screen bg-background pt-24 pb-20">
        <div className="px-6 max-w-5xl mx-auto animate-fade-in">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 border-b border-border pb-4">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all active:scale-95 shadow-sm hover:-translate-x-1">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-3xl font-black text-primary drop-shadow-sm">Gestão do Cardápio</h1>
            </div>

            <div className="flex gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm w-fit overflow-x-auto max-w-full">
              <button
                onClick={() => { setActiveTab('products'); setShowProdForm(false); }}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'bg-primary text-black shadow-md scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Tag className="w-4 h-4" /> Produtos
              </button>
              <button
                onClick={() => { setActiveTab('additions'); setShowProdForm(false); }}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'additions' ? 'bg-primary text-black shadow-md scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Layers className="w-4 h-4" /> Adicionais
              </button>
              <button
                onClick={() => { setActiveTab('categories'); setShowCatForm(false); }}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'categories' ? 'bg-primary text-black shadow-md scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Folder className="w-4 h-4" /> Categorias
              </button>
            </div>
          </div>

          {(activeTab === 'products' || activeTab === 'additions') && (
            <section className="animate-slide-up">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder={`Pesquisar ${activeTab === 'additions' ? 'adicional' : 'produto'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-black border border-border placeholder:text-gray-400 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.3)] transition-all font-medium"
                  />
                </div>

                {!showProdForm && (
                  <button onClick={() => setShowProdForm(true)} className="w-full md:w-auto bg-primary text-black font-black px-6 py-3 rounded-xl text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 hover:shadow-[0_0_15px_rgba(255,106,0,0.3)] hover:-translate-y-0.5">
                    <Plus className="w-5 h-5" /> Adicionar {activeTab === 'additions' ? 'Adicional' : 'Produto'}
                  </button>
                )}
              </div>

              {!showProdForm && activeTab === 'products' && visibleCategories.length > 0 && (
                <div className="flex items-center gap-2 mb-6 w-full">
                  <button
                    onClick={handleScrollLeft}
                    disabled={!canScrollLeft}
                    className={`p-2 rounded-full transition-all flex-shrink-0 flex items-center justify-center ${!canScrollLeft ? 'opacity-40 bg-card border border-border text-muted-foreground cursor-not-allowed' : 'bg-card border border-border text-foreground hover:bg-primary hover:text-black shadow-sm active:scale-95'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="flex gap-3 overflow-x-auto pb-2 flex-1 scrollbar-hide scroll-smooth px-1"
                  >
                    <button
                      onClick={() => setActiveCategoryFilter(null)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all border ${activeCategoryFilter === null ? 'bg-primary border-primary text-black shadow-md scale-105' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      🍔 Todos
                    </button>
                    {visibleCategories.map(cat => {
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategoryFilter(cat.id)}
                          className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all border ${activeCategoryFilter === cat.id ? 'bg-primary border-primary text-black shadow-md scale-105' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}
                        >
                          {cat.emoji} {cat.name}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={handleScrollRight}
                    disabled={!canScrollRight}
                    className={`p-2 rounded-full transition-all flex-shrink-0 flex items-center justify-center ${!canScrollRight ? 'opacity-40 bg-card border border-border text-muted-foreground cursor-not-allowed' : 'bg-card border border-border text-foreground hover:bg-primary hover:text-black shadow-sm active:scale-95'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {showProdForm && (
                <div style={{ backgroundColor: '#111' }} className="border border-gray-800 p-6 rounded-2xl shadow-2xl mb-8 relative overflow-hidden animate-fade-in text-white">
                  {editProdId && <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl">
                      {editProdId 
                        ? (activeTab === 'additions' ? '✏️ Editando Adicional' : '✏️ Editando Produto') 
                        : (activeTab === 'additions' ? '🥓 Cadastrar Adicional' : '🍔 Cadastrar Produto')}
                    </h3>
                    <button onClick={cancelEditProduct} className="p-2 text-gray-400 hover:text-destructive hover:bg-destructive/20 rounded-lg transition-all"><X className="w-6 h-6"/></button>
                  </div>

                  <div className={`grid grid-cols-1 ${activeTab === 'additions' ? 'md:grid-cols-3' : 'md:grid-cols-3'} gap-5 mb-5`}>
                    <div>
                      <label className="text-sm font-bold text-gray-300 mb-2 block">
                        {activeTab === 'additions' ? 'Nome do Adicional' : 'Nome do Produto'}
                      </label>
                      <input
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (prodErrors.name && e.target.value.trim()) setProdErrors(prev => ({ ...prev, name: false }));
                        }}
                        placeholder={activeTab === 'additions' ? "Adicional" : "Produto"}
                        className={`${inputClass} ${prodErrors.name ? inputErrorClass : name.trim() ? inputSuccessClass : ''}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-300 mb-2 block">Preço (R$)</label>
                      <input
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          if (prodErrors.price && Number(e.target.value.replace(',', '.')) > 0) setProdErrors(prev => ({ ...prev, price: false }));
                        }}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className={`${inputClass} ${prodErrors.price ? inputErrorClass : Number(String(price).replace(',', '.')) > 0 ? inputSuccessClass : ''}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-300 mb-2 block">Setor de Impressão</label>
                      <select
                        value={setor_impressao}
                        onChange={(e) => setSetorImpressao(e.target.value)}
                        className={inputClass}
                      >
                        {printSetores.map((setor) => (
                          <option key={setor.value} value={setor.value}>
                            {setor.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs font-medium text-gray-500">
                        Use Todos quando uma única impressora deve receber o pedido completo.
                      </p>
                    </div>
                  </div>

                  {activeTab === 'products' && (
                    <div className="mb-8">
                      <label className="text-sm font-bold text-gray-300 mb-2 block">Categoria</label>
                      <select
                        value={categoryId}
                        onChange={(e) => {
                          setCategoryId(e.target.value);
                          if (prodErrors.categoryId && e.target.value) setProdErrors(prev => ({ ...prev, categoryId: false }));
                        }}
                        className={`${inputClass} ${prodErrors.categoryId ? inputErrorClass : categoryId ? inputSuccessClass : ''}`}
                      >
                        <option value="" disabled>Selecione uma categoria...</option>
                        {visibleCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button 
                    onClick={handleSubmitProduct} 
                    disabled={loadingProd} 
                    className="w-full py-4 mt-3 rounded-xl bg-primary text-black font-black text-[15px] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(255,106,0,0.4)]"
                  >
                    {loadingProd ? <Loader2 className="w-5 h-5 animate-spin" /> : editProdId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {filteredProducts.length === 0 && !showProdForm && (
                  <p className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border font-medium">
                    {searchQuery 
                      ? 'Nenhum item encontrado na pesquisa.' 
                      : activeTab === 'additions' 
                        ? 'Nenhum adicional cadastrado. Clique em Adicionar Adicional para começar!'
                        : 'Nenhum produto cadastrado nesta categoria.'}
                  </p>
                )}
                {filteredProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 group">
                    <div>
                      <p className="font-black text-lg text-foreground mb-1 group-hover:text-primary transition-colors">{p.name}</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${activeTab === 'additions' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                          {activeTab === 'additions' ? '➕ Adicional' : getCategoryLabel(p.categoryId)}
                        </span>
                        {p.setor_impressao && (
                          <span className="text-xs font-bold px-2 py-1 rounded-md bg-blue-500/10 text-blue-500">
                            {p.setor_impressao}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-lg bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-lg">
                        R$ {Number(p.price).toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => startEditProduct(p)} className="p-2.5 bg-muted text-foreground rounded-lg hover:bg-primary hover:text-black transition-colors active:scale-90 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteProdTarget(p)} className="p-2.5 bg-muted text-destructive hover:bg-destructive hover:text-white rounded-lg transition-colors active:scale-90 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'categories' && (
            <section className="animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-muted-foreground">Gerenciar Categorias</h2>
                {!showCatForm && (
                  <button onClick={() => setShowCatForm(true)} className="bg-primary text-black font-black px-6 py-3 rounded-xl text-sm shadow-md hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(255,106,0,0.3)]">
                    <Plus className="w-5 h-5" /> Nova Categoria
                  </button>
                )}
              </div>

              {showCatForm && (
                <div style={{ backgroundColor: '#111' }} className="border border-gray-800 p-6 rounded-2xl shadow-2xl mb-8 relative overflow-hidden animate-fade-in text-white">
                  {editCatId && <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl">{editCatId ? '✏️ Editando Categoria' : '📁 Cadastrar Categoria'}</h3>
                    <button onClick={cancelEditCategory} className="p-2 text-gray-400 hover:text-destructive hover:bg-destructive/20 rounded-lg transition-all"><X className="w-6 h-6"/></button>
                  </div>

                  <div className="flex gap-4 mb-8">
                    <div className="w-24">
                      <label className="text-sm font-bold text-gray-300 mb-2 block text-center">Ícone</label>
                      <input value={catEmoji} onChange={e => setCatEmoji(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-white text-black border border-border text-center text-3xl focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.3)] outline-none transition-all" maxLength={2} />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-bold text-gray-300 mb-2 block">Nome da Categoria</label>
                      <input
                        value={catName}
                        onChange={(e) => {
                          setCatName(e.target.value);
                          if (catErrors.name && e.target.value.trim()) setCatErrors(prev => ({ ...prev, name: false }));
                        }}
                        placeholder="Ex: Bebidas"
                        className={`${inputClass} ${catErrors.name ? inputErrorClass : catName.trim() ? inputSuccessClass : ''}`}
                      />
                    </div>
                  </div>

                  <button onClick={handleSubmitCategory} disabled={loadingCat} className="w-full py-4 rounded-xl bg-primary text-black font-black text-[15px] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(255,106,0,0.4)]">
                    {loadingCat ? <Loader2 className="w-5 h-5 animate-spin" /> : editCatId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleCategories.length === 0 && !showCatForm && <p className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border font-medium">Nenhuma categoria cadastrada.</p>}
                {visibleCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 group">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl drop-shadow-md">{cat.emoji}</span>
                      <p className="font-black text-foreground text-xl group-hover:text-primary transition-colors">{cat.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditCategory(cat)} className="p-2.5 bg-muted rounded-lg hover:bg-primary hover:text-black transition-colors active:scale-90"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteCatTarget(cat)} className="p-2.5 bg-muted text-destructive hover:bg-destructive hover:text-white rounded-lg transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {deleteProdTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-[#111] p-6 text-white shadow-2xl animate-fade-in">
            <h3 className="text-xl font-black mb-2">Excluir Item?</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Tem certeza que deseja excluir o item <span className="font-bold text-white">"{deleteProdTarget.name}"</span>?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteProdTarget(null)}
                className="flex-1 rounded-2xl bg-gray-800 hover:bg-gray-700 py-3 font-bold transition-all active:scale-95"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  await deleteProduct(deleteProdTarget.id);
                  toast.success("Item removido com sucesso.");
                  setDeleteProdTarget(null);
                }}
                className="flex-1 rounded-2xl bg-red-600 hover:bg-red-500 py-3 font-black text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCatTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-[#111] p-6 text-white shadow-2xl animate-fade-in">
            <h3 className="text-xl font-black mb-2">Excluir Categoria?</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Tem certeza que deseja excluir a categoria <span className="font-bold text-white">{deleteCatTarget.emoji} "{deleteCatTarget.name}"</span>?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteCatTarget(null)}
                className="flex-1 rounded-2xl bg-gray-800 hover:bg-gray-700 py-3 font-bold transition-all active:scale-95"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  await deleteCategory(deleteCatTarget.id);
                  toast.success("Categoria removida com sucesso.");
                  setDeleteCatTarget(null);
                }}
                className="flex-1 rounded-2xl bg-red-600 hover:bg-red-500 py-3 font-black text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
