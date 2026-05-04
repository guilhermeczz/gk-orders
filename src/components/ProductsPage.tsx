import { useState, useEffect, useMemo, useRef } from 'react';

import { useAppStore } from '@/lib/store';

import { toast } from 'sonner';

import { Plus, Trash2, ArrowLeft, Edit2, X, Loader2, Tag, Folder, Search, ChevronRight, ChevronLeft } from 'lucide-react';

import { Link } from '@tanstack/react-router';
import { AppHeader } from '@/components/AppHeader';



export function ProductsPage() {

  const {

    products,

    categories,

    addProduct,

    updateProduct,

    deleteProduct,

    addCategory,

    updateCategory,

    deleteCategory

  } = useAppStore();



  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  const [showProdForm, setShowProdForm] = useState(false);

  const [showCatForm, setShowCatForm] = useState(false);



  const [name, setName] = useState('');

  const [price, setPrice] = useState('');

  const [categoryId, setCategoryId] = useState('');

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
const [catErrors, setCatErrors] = useState<{
  name?: boolean;
}>({});


  const scrollContainerRef = useRef<HTMLDivElement>(null);

 

  // 👇 Estados para saber se tem rolagem disponível

  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const [canScrollRight, setCanScrollRight] = useState(false);



  // 👇 Função que "espiona" a posição da rolagem

  const checkScroll = () => {

    if (scrollContainerRef.current) {

      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

      setCanScrollLeft(scrollLeft > 0);

      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);

    }

  };



  // Executa o espião de rolagem quando a tela abre ou muda de tamanho

  useEffect(() => {

    const timer = setTimeout(checkScroll, 100);

    window.addEventListener('resize', checkScroll);

    return () => {

      clearTimeout(timer);

      window.removeEventListener('resize', checkScroll);

    };

  }, [categories, activeTab, showProdForm]);



  useEffect(() => {

    if (categories.length > 0 && !categoryId) {

      setCategoryId(categories[0].id);

    }

  }, [categories, categoryId]);



  const handleScrollRight = () => {

    if (scrollContainerRef.current) {

      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });

    }

  };



  const handleScrollLeft = () => {

    if (scrollContainerRef.current) {

      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });

    }

  };



const handleSubmitProduct = async () => {
  const nextErrors = {
    name: !name.trim(),
    price: !price || Number(price) <= 0,
    categoryId: !categoryId,
  };

  setProdErrors(nextErrors);

  if (nextErrors.name) {
    toast.error('Informe o nome do produto.');
    return;
  }

  if (nextErrors.price) {
    toast.error('Informe um preço válido.');
    return;
  }

  if (nextErrors.categoryId) {
    toast.error('Selecione uma categoria.');
    return;
  }

  setLoadingProd(true);

  try {
    if (editProdId) {
      await updateProduct({
        id: editProdId,
        name: name.trim(),
        price: Number(price),
        categoryId,
      });

      toast.success('Produto atualizado!');
    } else {
      await addProduct({
        name: name.trim(),
        price: Number(price),
        categoryId,
      });

      toast.success('Produto adicionado!');
    }

    setName('');
    setPrice('');
    setEditProdId(null);
    setShowProdForm(false);
    setProdErrors({});
  } catch (error) {
    console.error(error);
    toast.error('Erro ao processar produto.');
  } finally {
    setLoadingProd(false);
  }

  };



  const startEditProduct = (p: any) => {

    setName(p.name);

    setPrice(p.price.toString());

    setCategoryId(p.categoryId);

    setEditProdId(p.id);

    setShowProdForm(true);

  };



  const cancelEditProduct = () => {
  setName('');
  setPrice('');
  setEditProdId(null);
  setShowProdForm(false);
  setProdErrors({});
};



const handleSubmitCategory = async () => {
  const nextErrors = {
    name: !catName.trim(),
  };

  setCatErrors(nextErrors);

  if (nextErrors.name) {
    toast.error('Informe o nome da categoria.');
    return;
  }

  setLoadingCat(true);

  try {
    if (editCatId) {
      await updateCategory({
        id: editCatId,
        name: catName.trim(),
        emoji: catEmoji,
      });

      toast.success('Categoria atualizada!');
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
    console.error(error);
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



  const getCategoryLabel = (catId: string) => {

    const cat = categories.find(c => c.id === catId);

    return cat ? `${cat.emoji} ${cat.name}` : 'Sem categoria';

  };



  const filteredProducts = useMemo(() => {

    return products.filter(p => {

      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = activeCategoryFilter ? p.categoryId === activeCategoryFilter : true;

      return matchesSearch && matchesCategory;

    });

  }, [products, searchQuery, activeCategoryFilter]);



  const inputClass = "w-full px-4 py-3.5 rounded-xl bg-white text-black border border-border placeholder:text-gray-400 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.2)] transition-all font-medium";
  const inputErrorClass =
  'border-red-500 ring-4 ring-red-500/10 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.25)]';

const inputSuccessClass =
  'border-green-500/60 focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.2)]';


 return (
  <>
    <div className="print:hidden">
      <AppHeader />
    </div>

    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="px-6 max-w-5xl mx-auto animate-fade-in">

       

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-border pb-4">

          <div className="flex items-center gap-4">

            <Link to="/dashboard" className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all active:scale-95 shadow-sm hover:-translate-x-1">

              <ArrowLeft className="w-5 h-5" />

            </Link>

            <h1 className="text-3xl font-black text-primary drop-shadow-sm">Gestão do Cardápio</h1>

          </div>



          <div className="flex gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm w-fit">

            <button

              onClick={() => setActiveTab('products')}

              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-primary text-black shadow-md scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}

            >

              <Tag className="w-4 h-4" /> Produtos

            </button>

            <button

              onClick={() => setActiveTab('categories')}

              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-primary text-black shadow-md scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}

            >

              <Folder className="w-4 h-4" /> Categorias

            </button>

          </div>

        </div>



        {activeTab === 'products' && (

          <section className="animate-slide-up">

           

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">

             

              <div className="relative w-full md:w-96 group">

                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />

                <input

                  type="text"

                  placeholder="Pesquisar produto..."

                  value={searchQuery}

                  onChange={(e) => setSearchQuery(e.target.value)}

                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-black border border-border placeholder:text-gray-400 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(255,106,0,0.3)] transition-all font-medium"

                />

              </div>



              {!showProdForm && (

                <button onClick={() => setShowProdForm(true)} className="w-full md:w-auto bg-primary text-black font-black px-6 py-3 rounded-xl text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 hover:shadow-[0_0_15px_rgba(255,106,0,0.3)] hover:-translate-y-0.5">

                  <Plus className="w-5 h-5" /> Adicionar Produto

                </button>

              )}

            </div>



            {!showProdForm && categories.length > 0 && (

              <div className="flex items-center gap-2 mb-6 w-full">

               

                {/* 👇 Seta Esquerda Inteligente 👇 */}

                <button

                  onClick={handleScrollLeft}

                  disabled={!canScrollLeft}

                  className={`p-2 rounded-full transition-all flex-shrink-0 flex items-center justify-center ${

                    !canScrollLeft

                      ? 'opacity-40 bg-card border border-border text-muted-foreground cursor-not-allowed'

                      : !canScrollRight

                        ? 'bg-primary text-black shadow-md animate-pulse hover:animate-none hover:bg-orange-500 active:scale-95'

                        : 'bg-card border border-border text-foreground hover:bg-primary hover:text-black shadow-sm active:scale-95'

                  }`}

                  title="Rolar para esquerda"

                >

                  <ChevronLeft className="w-5 h-5" />

                </button>



                {/* Container das Pílulas com Evento de Scroll */}

                <div

                  ref={scrollContainerRef}

                  onScroll={checkScroll}

                  className="flex gap-3 overflow-x-auto pb-2 flex-1 scrollbar-hide scroll-smooth px-1"

                >

                  <button

                    onClick={() => setActiveCategoryFilter(null)}

                    className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all border ${

                      activeCategoryFilter === null

                      ? 'bg-primary border-primary text-black shadow-md scale-105'

                      : 'bg-card border-border text-muted-foreground hover:border-primary/50'

                    }`}

                  >

                    🍔 Todos

                  </button>

                  {categories.map(cat => (

                    <button

                      key={cat.id}

                      onClick={() => setActiveCategoryFilter(cat.id)}

                      className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all border ${

                        activeCategoryFilter === cat.id

                        ? 'bg-primary border-primary text-black shadow-md scale-105'

                        : 'bg-card border-border text-muted-foreground hover:border-primary/50'

                      }`}

                    >

                      {cat.emoji} {cat.name}

                    </button>

                  ))}

                </div>



                {/* 👇 Seta Direita Inteligente 👇 */}

                <button

                  onClick={handleScrollRight}

                  disabled={!canScrollRight}

                  className={`p-2 rounded-full transition-all flex-shrink-0 flex items-center justify-center ${

                    !canScrollRight

                      ? 'opacity-40 bg-card border border-border text-muted-foreground cursor-not-allowed'

                      : !canScrollLeft

                        ? 'bg-primary text-black shadow-md animate-pulse hover:animate-none hover:bg-orange-500 active:scale-95'

                        : 'bg-card border border-border text-foreground hover:bg-primary hover:text-black shadow-sm active:scale-95'

                  }`}

                  title="Ver mais categorias"

                >

                  <ChevronRight className="w-5 h-5" />

                </button>

              </div>

            )}



            {showProdForm && (

              <div style={{ backgroundColor: '#111' }} className="border border-gray-800 p-6 rounded-2xl shadow-2xl mb-8 relative overflow-hidden animate-fade-in text-white">

                {editProdId && <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />}

               

                <div className="flex justify-between items-center mb-6">

                  <h3 className="font-black text-xl">{editProdId ? '✏️ Editando Produto' : '🍔 Cadastrar Produto'}</h3>

                  <button onClick={cancelEditProduct} className="p-2 text-gray-400 hover:text-destructive hover:bg-destructive/20 rounded-lg transition-all"><X className="w-6 h-6"/></button>

                </div>

               

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

                  <div>

                    <label className="text-sm font-bold text-gray-300 mb-2 block">Nome do Lanche</label>

                      <input
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);

                          if (prodErrors.name && e.target.value.trim()) {
                            setProdErrors((prev) => ({ ...prev, name: false }));
                          }
                        }}
                        placeholder="Ex: X-Salada"
                        className={`${inputClass} ${
                          prodErrors.name ? inputErrorClass : name.trim() ? inputSuccessClass : ''
                        }`}
                      />

                      {prodErrors.name && (
                        <p className="mt-2 text-xs font-bold text-red-500">
                          O nome do produto é obrigatório.
                        </p>
                      )}
                  </div>

                  <div>

                    <label className="text-sm font-bold text-gray-300 mb-2 block">Preço (R$)</label>

<input
  value={price}
  onChange={(e) => {
    setPrice(e.target.value);

    if (prodErrors.price && Number(e.target.value) > 0) {
      setProdErrors((prev) => ({ ...prev, price: false }));
    }
  }}
  type="number"
  inputMode="decimal"
  min="0"
  step="0.01"
  placeholder="0.00"
  className={`${inputClass} ${
    prodErrors.price ? inputErrorClass : Number(price) > 0 ? inputSuccessClass : ''
  }`}
/>

{prodErrors.price && (
  <p className="mt-2 text-xs font-bold text-red-500">
    Informe um preço maior que zero.
  </p>
)}
                  </div>

                </div>

               

                <div className="mb-8">

                  <label className="text-sm font-bold text-gray-300 mb-2 block">Categoria</label>

                  <select
  value={categoryId}
  onChange={(e) => {
    setCategoryId(e.target.value);

    if (prodErrors.categoryId && e.target.value) {
      setProdErrors((prev) => ({ ...prev, categoryId: false }));
    }
  }}
  className={`${inputClass} ${
    prodErrors.categoryId ? inputErrorClass : categoryId ? inputSuccessClass : ''
  }`}
>
  {prodErrors.categoryId && (
  <p className="mt-2 text-xs font-bold text-red-500">
    Selecione uma categoria para o produto.
  </p>
)}

                    <option value="" disabled>Selecione uma categoria...</option>

                    {categories.map(cat => (

                      <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>

                    ))}

                  </select>

                </div>

               

                <button onClick={handleSubmitProduct} disabled={loadingProd} className="w-full py-4 rounded-xl bg-primary text-black font-black text-[15px] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(255,106,0,0.4)]">

                  {loadingProd ? <Loader2 className="w-5 h-5 animate-spin" /> : editProdId ? 'Salvar Alterações' : 'Confirmar Cadastro'}

                </button>

              </div>

            )}



            <div className="space-y-3">

              {filteredProducts.length === 0 && !showProdForm && (

                <p className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border font-medium">

                  {searchQuery ? 'Nenhum produto encontrado na pesquisa.' : 'Nenhum produto cadastrado nesta categoria.'}

                </p>

              )}

              {filteredProducts.map(p => (

                <div key={p.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 group">

                  <div>

                    <p className="font-black text-lg text-foreground mb-1 group-hover:text-primary transition-colors">{p.name}</p>

                    <div className="flex items-center gap-3">

                      <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">

                        {getCategoryLabel(p.categoryId)}

                      </span>

                    </div>

                  </div>

                  <div className="flex items-center gap-4">

                    <span className="font-black text-lg bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-lg">

                      R$ {Number(p.price).toFixed(2)}

                    </span>

                    <div className="flex gap-2">

                      <button onClick={() => startEditProduct(p)} className="p-2.5 bg-muted text-foreground rounded-lg hover:bg-primary hover:text-black transition-colors active:scale-90 opacity-100 md:opacity-0 md:group-hover:opacity-100"><Edit2 className="w-4 h-4" /></button>

                      <button onClick={async () => { if(confirm(`Excluir ${p.name}?`)) { await deleteProduct(p.id); toast.success("Removido."); } }} className="p-2.5 bg-muted text-destructive hover:bg-destructive hover:text-white rounded-lg transition-colors active:scale-90 opacity-100 md:opacity-0 md:group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>

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

    if (catErrors.name && e.target.value.trim()) {
      setCatErrors((prev) => ({ ...prev, name: false }));
    }
  }}
  placeholder="Ex: Bebidas"
  className={`${inputClass} ${
    catErrors.name ? inputErrorClass : catName.trim() ? inputSuccessClass : ''
  }`}
/>

{catErrors.name && (
  <p className="mt-2 text-xs font-bold text-red-500">
    O nome da categoria é obrigatório.
  </p>
)}
                  </div>

                </div>

               

                <button onClick={handleSubmitCategory} disabled={loadingCat} className="w-full py-4 rounded-xl bg-primary text-black font-black text-[15px] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(255,106,0,0.4)]">

                  {loadingCat ? <Loader2 className="w-5 h-5 animate-spin" /> : editCatId ? 'Salvar Alterações' : 'Confirmar Cadastro'}

                </button>

              </div>

            )}



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {categories.length === 0 && !showCatForm && <p className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border font-medium">Nenhuma categoria cadastrada.</p>}

              {categories.map(cat => (

                <div key={cat.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 group">

                  <div className="flex items-center gap-4">

                    <span className="text-4xl drop-shadow-md">{cat.emoji}</span>

                    <p className="font-black text-foreground text-xl group-hover:text-primary transition-colors">{cat.name}</p>

                  </div>

                  <div className="flex gap-2">

                    <button onClick={() => startEditCategory(cat)} className="p-2.5 bg-muted rounded-lg hover:bg-primary hover:text-black transition-colors active:scale-90"><Edit2 className="w-4 h-4" /></button>

                    <button onClick={async () => { if(confirm(`Excluir ${cat.name}?`)) { await deleteCategory(cat.id); toast.success("Categoria removida."); } }} className="p-2.5 bg-muted text-destructive hover:bg-destructive hover:text-white rounded-lg transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>

                  </div>

                </div>

              ))}

            </div>

          </section>

        )}



         </div>
    </div>
  </>
);
}