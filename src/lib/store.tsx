import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  Order,
  Product,
  User,
  OrderStatus,
  OrderItem,
  Category,
  PaymentMethod,
  OrderBatch,
} from './types';
import { supabase } from './supabase';
import { toast } from 'sonner';

interface CashPaymentMeta {
  amountReceived?: number;
  changeGiven?: number;
}

interface AppState {
  orders: Order[];
  products: Product[];
  users: User[];
  categories: Category[];
  orderCounter: number;
  fetchUsers: () => Promise<void>;
  fetchData: () => Promise<void>;
  addOrder: (
    customerName: string,
    items: OrderItem[],
    notes?: string,
    createdBy?: string
  ) => Promise<void>;
  updateOrder: (
    orderId: string,
    customerName: string,
    items: OrderItem[],
    notes?: string
  ) => Promise<void>;
  appendItemsToOrder: (
    orderId: string,
    items: OrderItem[],
    notes?: string
  ) => Promise<void>;
  moveOrder: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  payOrder: (
    orderId: string,
    paymentMethod: PaymentMethod,
    cashMeta?: CashPaymentMeta
  ) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getTodayOrders: () => Order[];
  getArchivedOrders: (startDate: Date, endDate: Date) => Order[];
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchUsers = useCallback(async () => {
    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('id, nome, username')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return;
    }

    if (userData) {
      setUsers(
        userData.map((u: any) => ({
          id: u.id,
          name: u.nome,
          username: u.username,
        }))
      );
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: catData } = await supabase.from('categorias').select('*');
      if (catData) {
        setCategories(
          catData.map((c: any) => ({
            id: String(c.id),
            name: c.nome,
            emoji: c.emoji,
          }))
        );
      }

      const { data: prodData } = await supabase.from('produtos').select('*');
      if (prodData) {
        setProducts(
          prodData.map((p: any) => ({
            id: String(p.id),
            name: p.nome,
            price: Number(p.preco),
            categoryId: String(p.categoria_id),
            active: p.ativo,
          }))
        );
      }

      await fetchUsers();

      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .select('*, pedido_itens(*)')
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Erro ao buscar pedidos:', orderError);
        return;
      }

      if (orderData) {
        const mappedOrders: Order[] = orderData.map((o: any) => {
          const itemRows = Array.isArray(o.pedido_itens) ? o.pedido_itens : [];

          const sortedItems = [...itemRows].sort((a: any, b: any) => {
            const batchCompare = Number(a.batch_number || 1) - Number(b.batch_number || 1);
            if (batchCompare !== 0) return batchCompare;
            return Number(a.id) - Number(b.id);
          });

          const allItems: OrderItem[] = sortedItems.map((item: any) => ({
            productId: String(item.produto_id || item.id),
            productName: item.produto_nome,
            quantity: item.quantidade,
            unitPrice: Number(item.preco_unitario),
          }));

          const groupedBatches = new Map<number, OrderBatch>();

          sortedItems.forEach((item: any) => {
            const batchNumber = Number(item.batch_number || 1);

            if (!groupedBatches.has(batchNumber)) {
              groupedBatches.set(batchNumber, {
                id: `order-${o.id}-batch-${batchNumber}`,
                items: [],
                notes: item.batch_notes || o.observacao || '',
                createdAt: item.batch_created_at || o.created_at,
                isAdditional: batchNumber > 1,
              });
            }

            groupedBatches.get(batchNumber)!.items.push({
              productId: String(item.produto_id || item.id),
              productName: item.produto_nome,
              quantity: item.quantidade,
              unitPrice: Number(item.preco_unitario),
            });
          });

          return {
            id: String(o.id),
            number: o.id,
            customerName: o.cliente_nome,
            total: Number(o.valor_total),
            status: o.status as OrderStatus,
            paid: o.pago,
            paymentMethod: o.forma_pagamento as PaymentMethod,
            notes: o.observacao,
            createdAt: new Date(o.created_at),
            paidAt: o.paid_at ? new Date(o.paid_at) : undefined,
            cashSessionId: o.cash_session_id ?? null,
            amountReceived: o.amount_received != null ? Number(o.amount_received) : null,
            changeGiven: o.change_given != null ? Number(o.change_given) : null,
            createdBy: o.created_by ?? null,
            items: allItems,
            itemBatches: Array.from(groupedBatches.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            ),
          };
        });

        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }, [fetchUsers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let isMounted = true;

    const channel = supabase
      .channel(`pedidos-sync-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        async () => {
          if (isMounted) await fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_itens' },
        async () => {
          if (isMounted) await fetchData();
        }
      )
      .subscribe((status) => {
        console.log('Realtime pedidos:', status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const addOrder = useCallback(
    async (
      customerName: string,
      items: OrderItem[],
      notes: string = '',
      createdBy?: string
    ) => {
      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const safeCreatedBy = String(createdBy || '').trim() || 'Operador';

      const { data: order, error } = await supabase
        .from('pedidos')
        .insert([
          {
            cliente_nome: customerName,
            valor_total: total,
            status: 'new',
            observacao: notes,
            created_by: safeCreatedBy,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const itemsToInsert = items.map((item) => ({
        pedido_id: order.id,
        produto_id: item.productId,
        produto_nome: item.productName,
        quantidade: item.quantity,
        preco_unitario: item.unitPrice,
        batch_number: 1,
        batch_notes: notes,
        batch_created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase.from('pedido_itens').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      await fetchData();
      toast.success('Pedido realizado!');
    },
    [fetchData]
  );

  const updateOrder = useCallback(
    async (orderId: string, customerName: string, items: OrderItem[], notes: string = '') => {
      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const { error: orderError } = await supabase
        .from('pedidos')
        .update({
          cliente_nome: customerName,
          valor_total: total,
          observacao: notes,
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { error: deleteError } = await supabase
        .from('pedido_itens')
        .delete()
        .eq('pedido_id', orderId);

      if (deleteError) throw deleteError;

      const itemsToInsert = items.map((item) => ({
        pedido_id: orderId,
        produto_id: item.productId,
        produto_nome: item.productName,
        quantidade: item.quantity,
        preco_unitario: item.unitPrice,
        batch_number: 1,
        batch_notes: notes,
        batch_created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from('pedido_itens').insert(itemsToInsert);
      if (insertError) throw insertError;

      await fetchData();
      toast.success('Pedido atualizado!');
    },
    [fetchData]
  );

  const appendItemsToOrder = useCallback(
    async (orderId: string, items: OrderItem[], notes: string = '') => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error('Pedido não encontrado.');

      const nextBatchNumber =
        Array.isArray(order.itemBatches) && order.itemBatches.length > 0
          ? order.itemBatches.length + 1
          : 2;

      const additionalTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const nextTotal = Number(order.total || 0) + additionalTotal;

      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          valor_total: nextTotal,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      const nowIso = new Date().toISOString();

      const itemsToInsert = items.map((item) => ({
        pedido_id: orderId,
        produto_id: item.productId,
        produto_nome: item.productName,
        quantidade: item.quantity,
        preco_unitario: item.unitPrice,
        batch_number: nextBatchNumber,
        batch_notes: notes,
        batch_created_at: nowIso,
      }));

      const { error: insertError } = await supabase.from('pedido_itens').insert(itemsToInsert);
      if (insertError) throw insertError;

      await fetchData();
      toast.success('Itens adicionados ao pedido!');
    },
    [fetchData, orders]
  );

  const moveOrder = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      await fetchData();
    },
    [fetchData]
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.from('pedidos').delete().eq('id', orderId);
      if (error) throw error;

      await fetchData();
    },
    [fetchData]
  );

  const payOrder = useCallback(
    async (
      orderId: string,
      paymentMethod: PaymentMethod,
      cashMeta?: { amountReceived?: number; changeGiven?: number }
    ) => {
      try {
        let cashSessionId: number | null = null;

        const { data: openSession, error: openSessionError } = await supabase
          .from('cash_sessions')
          .select('id')
          .eq('status', 'open')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openSessionError) throw openSessionError;

        if (openSession?.id) {
          cashSessionId = openSession.id;
        }

        const updatePayload: any = {
          status: 'paid',
          pago: true,
          forma_pagamento: paymentMethod,
          paid_at: new Date().toISOString(),
          cash_session_id: cashSessionId,
        };

        if (paymentMethod === 'dinheiro') {
          updatePayload.amount_received = Number(cashMeta?.amountReceived || 0);
          updatePayload.change_given = Number(cashMeta?.changeGiven || 0);
        } else {
          updatePayload.amount_received = null;
          updatePayload.change_given = null;
        }

        const { error } = await supabase
          .from('pedidos')
          .update(updatePayload)
          .eq('id', orderId);

        if (error) throw error;

        await fetchData();
        toast.success('Pagamento confirmado!');
      } catch (error) {
        console.error('Erro ao pagar pedido:', error);
        toast.error('Não foi possível finalizar o pagamento.');
        throw error;
      }
    },
    [fetchData]
  );

  const addProduct = useCallback(
    async (product: Omit<Product, 'id'>) => {
      const { error } = await supabase.from('produtos').insert([
        {
          nome: product.name,
          preco: product.price,
          categoria_id: product.categoryId,
        },
      ]);

      if (error) return false;
      await fetchData();
      return true;
    },
    [fetchData]
  );

  const updateProduct = useCallback(
    async (product: Product) => {
      await supabase
        .from('produtos')
        .update({
          nome: product.name,
          preco: product.price,
          categoria_id: product.categoryId,
        })
        .eq('id', product.id);

      await fetchData();
      toast.success('Produto atualizado!');
    },
    [fetchData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await supabase.from('produtos').delete().eq('id', id);
      await fetchData();
    },
    [fetchData]
  );

  const addCategory = useCallback(
    async (category: Omit<Category, 'id'>) => {
      await supabase.from('categorias').insert([{ nome: category.name, emoji: category.emoji }]);
      await fetchData();
    },
    [fetchData]
  );

  const updateCategory = useCallback(
    async (category: Category) => {
      await supabase
        .from('categorias')
        .update({
          nome: category.name,
          emoji: category.emoji,
        })
        .eq('id', category.id);

      await fetchData();
      toast.success('Categoria atualizada!');
    },
    [fetchData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await supabase.from('categorias').delete().eq('id', id);
      await fetchData();
    },
    [fetchData]
  );

  const addUser = useCallback(
    async (user: Omit<User, 'id'>) => {
      const { error } = await supabase.from('usuarios').insert([
        {
          nome: user.name,
          username: user.username,
        },
      ]);

      if (error) return false;
      await fetchUsers();
      return true;
    },
    [fetchUsers]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      const targetUser = users.find((u) => u.id === id);

      const isProtected =
        targetUser &&
        (
          String(targetUser.name || '').trim().toLowerCase() === 'desenvolvedor' ||
          String(targetUser.username || '').trim().toLowerCase() === 'dev'
        );

      if (isProtected) {
        toast.error('O acesso do Desenvolvedor é protegido e não pode ser removido.');
        return;
      }

      await supabase.from('usuarios').delete().eq('id', id);
      await fetchUsers();
    },
    [fetchUsers, users]
  );

  const getTodayOrders = () =>
    orders.filter((o: any) => {
      const orderDate = new Date(o.createdAt).toDateString();
      const today = new Date().toDateString();
      const isToday = orderDate === today;
      const isNotFinished = o.status !== 'paid';
      return isToday || isNotFinished;
    });

  const getArchivedOrders = (startDate: Date, endDate: Date) =>
    orders.filter((o: any) => {
      const date = new Date(o.createdAt);
      return date >= startDate && date <= endDate;
    });

  return (
    <AppContext.Provider
      value={{
        orders,
        products,
        users,
        categories,
        orderCounter: orders.length + 1,
        fetchUsers,
        fetchData,
        addOrder,
        updateOrder,
        appendItemsToOrder,
        moveOrder,
        deleteOrder,
        payOrder,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addUser,
        deleteUser,
        getTodayOrders,
        getArchivedOrders,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}