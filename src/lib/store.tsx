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
  Mesa,
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
  mesas: Mesa[];
  orderCounter: number;

  fetchUsers: () => Promise<void>;
  fetchMesas: () => Promise<void>;
  fetchData: () => Promise<void>;

  addOrder: (
    customerName: string,
    items: OrderItem[],
    notes?: string,
    createdBy?: string,
    mesaId?: string | null
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

  updateOrderItem: (itemId: string, quantity: number) => Promise<void>;
  deleteOrderItem: (itemId: string) => Promise<void>;

  moveOrder: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  payOrder: (
    orderId: string,
    paymentMethod: PaymentMethod,
    cashMeta?: CashPaymentMeta
  ) => Promise<void>;

  payOrdersBulk: (
    orderIds: string[],
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

  addMesa: (data: {
    numero: number;
    nome?: string;
    garcomNome?: string;
  }) => Promise<boolean>;

  addMesasEmLote: (data: {
    inicial: number;
    final: number;
    prefixoNome?: string;
    garcomNome?: string;
  }) => Promise<boolean>;

  updateMesa: (mesa: Mesa) => Promise<void>;
  deleteMesa: (mesaId: string) => Promise<void>;

  getTodayOrders: () => Order[];
  getArchivedOrders: (startDate: Date, endDate: Date) => Order[];
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);

  const fetchUsers = useCallback(async () => {
    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('id, nome, username')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return;
    }

    setUsers(
      (userData ?? []).map((u: any) => ({
        id: String(u.id),
        name: u.nome,
        username: u.username,
      }))
    );
  }, []);

  const fetchMesas = useCallback(async () => {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .order('numero', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mesas:', error);
      return;
    }

    setMesas(
      (data ?? []).map((mesa: any) => ({
        id: String(mesa.id),
        numero: Number(mesa.numero),
        nome: mesa.nome ?? null,
        status: mesa.status ?? 'livre',
        garcomNome: mesa.garcom_nome ?? null,
        ativa: mesa.ativa ?? true,
        createdAt: mesa.created_at ?? null,
        updatedAt: mesa.updated_at ?? null,
      }))
    );
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [
        { data: catData, error: catError },
        { data: prodData, error: prodError },
      ] = await Promise.all([
        supabase.from('categorias').select('*').order('nome'),
        supabase.from('produtos').select('*').order('nome'),
      ]);

      if (catError) {
        console.error('Erro ao buscar categorias:', catError);
      } else {
        setCategories(
          (catData ?? []).map((c: any) => ({
            id: String(c.id),
            name: c.nome,
            emoji: c.emoji ?? '',
          }))
        );
      }

      if (prodError) {
        console.error('Erro ao buscar produtos:', prodError);
      } else {
        setProducts(
          (prodData ?? []).map((p: any) => ({
            id: String(p.id),
            name: p.nome,
            price: Number(p.preco),
            categoryId: String(p.categoria_id),
            active: p.ativo ?? true,
          }))
        );
      }

      await Promise.all([fetchUsers(), fetchMesas()]);

      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .select('*, pedido_itens(*)')
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Erro ao buscar pedidos:', orderError);
        return;
      }

      const mappedOrders: Order[] = (orderData ?? []).map((o: any) => {
        const itemRows = Array.isArray(o.pedido_itens) ? o.pedido_itens : [];

        const sortedItems = [...itemRows].sort((a: any, b: any) => {
          const batchCompare =
            Number(a.batch_number || 1) - Number(b.batch_number || 1);

          if (batchCompare !== 0) return batchCompare;

          const aTime = a.batch_created_at
            ? new Date(a.batch_created_at).getTime()
            : a.created_at
              ? new Date(a.created_at).getTime()
              : 0;

          const bTime = b.batch_created_at
            ? new Date(b.batch_created_at).getTime()
            : b.created_at
              ? new Date(b.created_at).getTime()
              : 0;

          if (aTime !== bTime) return aTime - bTime;

          return Number(a.id) - Number(b.id);
        });

        const allItems: OrderItem[] = sortedItems.map((item: any) => ({
          id: String(item.id),
          productId: String(item.produto_id || item.id),
          productName: item.produto_nome,
          quantity: Number(item.quantidade),
          unitPrice: Number(item.preco_unitario),
          batchId: item.lote_id ?? undefined,
          batchNotes: item.lote_observacao || item.batch_notes || '',
          createdAt: item.batch_created_at || item.created_at || o.created_at,
        }));

        const groupedBatches = new Map<number, OrderBatch>();

        sortedItems.forEach((item: any) => {
          const batchNumber = Number(item.batch_number || 1);

          if (!groupedBatches.has(batchNumber)) {
            groupedBatches.set(batchNumber, {
              id: item.lote_id
                ? String(item.lote_id)
                : `order-${o.id}-batch-${batchNumber}`,
              items: [],
              notes: item.batch_notes || item.lote_observacao || o.observacao || '',
              createdAt: item.batch_created_at || item.created_at || o.created_at,
              isAdditional: batchNumber > 1,
            });
          }

          groupedBatches.get(batchNumber)!.items.push({
            id: String(item.id),
            productId: String(item.produto_id || item.id),
            productName: item.produto_nome,
            quantity: Number(item.quantidade),
            unitPrice: Number(item.preco_unitario),
            batchId: item.lote_id ?? undefined,
            batchNotes: item.lote_observacao || item.batch_notes || '',
            createdAt: item.batch_created_at || item.created_at || o.created_at,
          });
        });

        return {
          id: String(o.id),
          number: Number(o.id),
          customerName: o.cliente_nome,
          total: Number(o.valor_total),
          status: (o.status || 'new') as OrderStatus,
          paid: o.pago ?? false,
          paymentMethod: o.forma_pagamento as PaymentMethod,
          notes: o.observacao ?? '',
          createdAt: o.created_at ? new Date(o.created_at) : new Date(),
          paidAt: o.paid_at ? new Date(o.paid_at) : undefined,
          cashSessionId: o.cash_session_id ?? null,
          amountReceived:
            o.amount_received != null ? Number(o.amount_received) : null,
          changeGiven: o.change_given != null ? Number(o.change_given) : null,
          createdBy: o.created_by ?? null,
          mesaId: o.mesa_id ? String(o.mesa_id) : null,
          items: allItems,
          itemBatches: Array.from(groupedBatches.values()).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
      });

      setOrders(mappedOrders);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }, [fetchUsers, fetchMesas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

useEffect(() => {
  let isMounted = true;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const refreshNow = () => {
    if (!isMounted) return;

    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = setTimeout(async () => {
      if (!isMounted) return;

      try {
        await fetchData();
      } catch (error) {
        console.error('Erro ao sincronizar dados em tempo real:', error);
      }
    }, 150);
  };

  const channelName = `gardens-operacional-realtime-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pedidos' },
      () => refreshNow()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pedido_itens' },
      () => refreshNow()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mesas' },
      () => refreshNow()
    )
    .subscribe((status) => {
      console.log('Realtime Gardens:', status);

      if (status === 'SUBSCRIBED') {
        refreshNow();
      }
    });

  const handleFocus = () => {
    refreshNow();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      refreshNow();
    }
  };

  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    isMounted = false;

    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    supabase.removeChannel(channel);
  };
}, [fetchData]);

  const addOrder = useCallback(
    async (
      customerName: string,
      items: OrderItem[],
      notes: string = '',
      createdBy?: string,
      mesaId?: string | null
    ) => {
      const total = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

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
            mesa_id: mesaId ?? null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (mesaId) {
        const mesaAtual = mesas.find((m) => String(m.id) === String(mesaId));

        const { error: mesaError } = await supabase
          .from('mesas')
          .update({
            status: 'ocupada',
            garcom_nome: mesaAtual?.garcomNome ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mesaId);

        if (mesaError) throw mesaError;
      }

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

      const { error: itemsError } = await supabase
        .from('pedido_itens')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      await fetchData();
      toast.success('Pedido realizado!');
    },
    [fetchData, mesas]
  );

  const updateOrder = useCallback(
    async (
      orderId: string,
      customerName: string,
      items: OrderItem[],
      notes: string = ''
    ) => {
      const total = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

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

      const { error: insertError } = await supabase
        .from('pedido_itens')
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      await fetchData();
      toast.success('Pedido atualizado!');
    },
    [fetchData]
  );

  const appendItemsToOrder = useCallback(
    async (orderId: string, items: OrderItem[], notes: string = '') => {
      const order = orders.find((o) => String(o.id) === String(orderId));
      if (!order) throw new Error('Pedido não encontrado.');

      const nextBatchNumber =
        Array.isArray(order.itemBatches) && order.itemBatches.length > 0
          ? order.itemBatches.length + 1
          : 2;

      const additionalTotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

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

      const { error: insertError } = await supabase
        .from('pedido_itens')
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      await fetchData();
      toast.success('Itens adicionados ao pedido!');
    },
    [fetchData, orders]
  );

  const updateOrderItem = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        const qty = Number(quantity);

        if (!qty || qty <= 0) {
          toast.error('A quantidade deve ser maior que zero.');
          return;
        }

        const targetOrder = orders.find((order) =>
          (order.items ?? []).some((item) => String(item.id) === String(itemId))
        );

        if (!targetOrder) {
          toast.error('Item não encontrado.');
          return;
        }

        const { error: updateError } = await supabase
          .from('pedido_itens')
          .update({
            quantidade: qty,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;

        const updatedItems = targetOrder.items.map((item) =>
          String(item.id) === String(itemId) ? { ...item, quantity: qty } : item
        );

        const newTotal = updatedItems.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
          0
        );

        const { error: orderError } = await supabase
          .from('pedidos')
          .update({
            valor_total: newTotal,
          })
          .eq('id', targetOrder.id);

        if (orderError) throw orderError;

        await fetchData();
        toast.success('Item atualizado!');
      } catch (error) {
        console.error('Erro ao atualizar item:', error);
        toast.error('Não foi possível atualizar o item.');
      }
    },
    [orders, fetchData]
  );

  const deleteOrderItem = useCallback(
    async (itemId: string) => {
      try {
        const targetOrder = orders.find((order) =>
          (order.items ?? []).some((item) => String(item.id) === String(itemId))
        );

        if (!targetOrder) {
          toast.error('Item não encontrado.');
          return;
        }

        const remainingItems = (targetOrder.items ?? []).filter(
          (item) => String(item.id) !== String(itemId)
        );

        const { error: deleteError } = await supabase
          .from('pedido_itens')
          .delete()
          .eq('id', itemId);

        if (deleteError) throw deleteError;

        if (remainingItems.length === 0) {
          const { error: orderDeleteError } = await supabase
            .from('pedidos')
            .delete()
            .eq('id', targetOrder.id);

          if (orderDeleteError) throw orderDeleteError;

          if (targetOrder.mesaId) {
            const hasOtherOpenOrders = orders.some(
              (order) =>
                String(order.id) !== String(targetOrder.id) &&
                String(order.mesaId) === String(targetOrder.mesaId) &&
                order.status !== 'paid'
            );

            if (!hasOtherOpenOrders) {
              const { error: mesaError } = await supabase
                .from('mesas')
                .update({
                  status: 'livre',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', targetOrder.mesaId);

              if (mesaError) {
                console.error('Erro ao liberar mesa:', mesaError);
              }
            }
          }
        } else {
          const newTotal = remainingItems.reduce(
            (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
            0
          );

          const { error: orderUpdateError } = await supabase
            .from('pedidos')
            .update({
              valor_total: newTotal,
            })
            .eq('id', targetOrder.id);

          if (orderUpdateError) throw orderUpdateError;
        }

        await fetchData();
        toast.success('Item removido!');
      } catch (error) {
        console.error('Erro ao excluir item:', error);
        toast.error('Não foi possível excluir o item.');
      }
    },
    [orders, fetchData]
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
      const targetOrder = orders.find(
        (order) => String(order.id) === String(orderId)
      );

      const { error } = await supabase.from('pedidos').delete().eq('id', orderId);
      if (error) throw error;

      if (targetOrder?.mesaId) {
        const hasOtherOpenOrders = orders.some(
          (order) =>
            String(order.id) !== String(orderId) &&
            String(order.mesaId) === String(targetOrder.mesaId) &&
            order.status !== 'paid'
        );

        if (!hasOtherOpenOrders) {
          const { error: mesaError } = await supabase
            .from('mesas')
            .update({
              status: 'livre',
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetOrder.mesaId);

          if (mesaError) {
            console.error('Erro ao liberar mesa após exclusão:', mesaError);
          }
        }
      }

      await fetchData();
    },
    [fetchData, orders]
  );

  const payOrder = useCallback(
    async (
      orderId: string,
      paymentMethod: PaymentMethod,
      cashMeta?: CashPaymentMeta
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
        if (!cashSessionId) {
  toast.error('O caiixa esta fechado, ERRO.');
  throw new Error('Nenhum caixa aberto.');
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

        const targetOrder = orders.find(
          (o) => String(o.id) === String(orderId)
        );

        if (targetOrder?.mesaId) {
          const stillHasOpenOrders = orders.some(
            (o) =>
              String(o.id) !== String(orderId) &&
              String(o.mesaId) === String(targetOrder.mesaId) &&
              o.status !== 'paid'
          );

          if (!stillHasOpenOrders) {
            const { error: mesaError } = await supabase
              .from('mesas')
              .update({
                status: 'livre',
                updated_at: new Date().toISOString(),
              })
              .eq('id', targetOrder.mesaId);

            if (mesaError) throw mesaError;
          }
        }

        await fetchData();
        toast.success('Pagamento confirmado!');
      } catch (error) {
        console.error('Erro ao pagar pedido:', error);
        toast.error('Não foi possível finalizar o pagamento, Abra o caixa.');
        throw error;
      }
    },
    [fetchData, orders]
  );

  const payOrdersBulk = useCallback(
    async (
      orderIds: string[],
      paymentMethod: PaymentMethod,
      cashMeta?: CashPaymentMeta
    ) => {
      try {
        const validIds = orderIds.filter(Boolean);

        if (validIds.length === 0) {
          toast.error('Nenhum pedido informado para pagamento.');
          return;
        }

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
        if (!cashSessionId) {
  toast.error('O caixa esta fechado, ERRO.');
  throw new Error('Nenhum caixa aberto.');
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
          .in('id', validIds);

        if (error) throw error;

        const pedidosPagos = orders.filter((o) => validIds.includes(o.id));

        const mesaIds = Array.from(
          new Set(
            pedidosPagos
              .map((o) => o.mesaId)
              .filter((mesaId): mesaId is string => Boolean(mesaId))
          )
        );

        for (const mesaId of mesaIds) {
          const hasOtherOpenOrders = orders.some(
            (o) =>
              !validIds.includes(o.id) &&
              String(o.mesaId) === String(mesaId) &&
              o.status !== 'paid'
          );

          if (!hasOtherOpenOrders) {
            const { error: mesaError } = await supabase
              .from('mesas')
              .update({
                status: 'livre',
                updated_at: new Date().toISOString(),
              })
              .eq('id', mesaId);

            if (mesaError) throw mesaError;
          }
        }

        await fetchData();
        toast.success('Pagamento da mesa finalizado!');
      } catch (error) {
        console.error('Erro ao pagar pedidos em lote:', error);
        toast.error('Não foi possível finalizar os pedidos da mesa, CAIXA FECHADO.');
        throw error;
      }
    },
    [fetchData, orders]
  );

  const addProduct = useCallback(
    async (product: Omit<Product, 'id'>) => {
      const { error } = await supabase.from('produtos').insert([
        {
          nome: product.name,
          preco: product.price,
          categoria_id: product.categoryId,
          ativo: product.active ?? true,
        },
      ]);

      if (error) {
        console.error('Erro ao criar produto:', error);
        return false;
      }

      await fetchData();
      return true;
    },
    [fetchData]
  );

  const updateProduct = useCallback(
    async (product: Product) => {
      const { error } = await supabase
        .from('produtos')
        .update({
          nome: product.name,
          preco: product.price,
          categoria_id: product.categoryId,
          ativo: product.active ?? true,
        })
        .eq('id', product.id);

      if (error) {
        console.error('Erro ao atualizar produto:', error);
        toast.error('Erro ao atualizar produto.');
        return;
      }

      await fetchData();
      toast.success('Produto atualizado!');
    },
    [fetchData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('produtos').delete().eq('id', id);

      if (error) {
        console.error('Erro ao excluir produto:', error);
        toast.error('Erro ao excluir produto.');
        return;
      }

      await fetchData();
    },
    [fetchData]
  );

  const addCategory = useCallback(
    async (category: Omit<Category, 'id'>) => {
      const { error } = await supabase.from('categorias').insert([
        {
          nome: category.name,
          emoji: category.emoji,
        },
      ]);

      if (error) {
        console.error('Erro ao criar categoria:', error);
        toast.error('Erro ao criar categoria.');
        return;
      }

      await fetchData();
    },
    [fetchData]
  );

  const updateCategory = useCallback(
    async (category: Category) => {
      const { error } = await supabase
        .from('categorias')
        .update({
          nome: category.name,
          emoji: category.emoji,
        })
        .eq('id', category.id);

      if (error) {
        console.error('Erro ao atualizar categoria:', error);
        toast.error('Erro ao atualizar categoria.');
        return;
      }

      await fetchData();
      toast.success('Categoria atualizada!');
    },
    [fetchData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('categorias').delete().eq('id', id);

      if (error) {
        console.error('Erro ao excluir categoria:', error);
        toast.error('Erro ao excluir categoria.');
        return;
      }

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

      if (error) {
        console.error('Erro ao criar usuário:', error);
        return false;
      }

      await fetchUsers();
      return true;
    },
    [fetchUsers]
  );

const deleteUser = useCallback(
  async (id: string) => {
    const targetUser = users.find((u) => String(u.id) === String(id));

    const isProtected =
      targetUser &&
      (String(targetUser.name || '').trim().toLowerCase() === 'desenvolvedor' ||
        String(targetUser.username || '').trim().toLowerCase() === 'dev');

    if (isProtected) {
      toast.error('O acesso do Desenvolvedor é protegido e não pode ser removido.');
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const loggedUserId = session?.user?.id ? String(session.user.id) : null;
    const isDeletingLoggedUser = loggedUserId === String(id);

    const { data, error } = await supabase.functions.invoke('delete-operator', {
      body: {
        userId: id,
      },
    });

    if (error) {
      console.error('Erro ao chamar função delete-operator:', error);
      toast.error('Não foi possível excluir o operador.');
      return;
    }

    if (data?.error) {
      toast.error(data.error);
      return;
    }

    await fetchUsers();

    if (isDeletingLoggedUser || data?.deletedCurrentUser) {
      toast.warning('Seu acesso foi removido. Você será desconectado.');

      await supabase.auth.signOut();

      setTimeout(() => {
        window.location.href = '/';
      }, 800);

      return;
    }

    toast.success('Operador removido com sucesso.');
  },
  [fetchUsers, users]
);

  const addMesa = useCallback(
    async ({
      numero,
      nome,
      garcomNome,
    }: {
      numero: number;
      nome?: string;
      garcomNome?: string;
    }) => {
      try {
        const numeroNormalizado = Number(numero);

        if (!numeroNormalizado || numeroNormalizado <= 0) {
          toast.error('Informe um número de mesa válido.');
          return false;
        }

        const mesaExistente = mesas.some(
          (mesa) => Number(mesa.numero) === numeroNormalizado
        );

        if (mesaExistente) {
          toast.error(`A mesa ${numeroNormalizado} já existe.`);
          return false;
        }

        const { error } = await supabase.from('mesas').insert([
          {
            numero: numeroNormalizado,
            nome: nome?.trim() || `Mesa ${numeroNormalizado}`,
            status: 'livre',
            garcom_nome: garcomNome?.trim() || null,
            ativa: true,
          },
        ]);

        if (error) {
          console.error('Erro ao criar mesa:', error);
          toast.error('Não foi possível criar a mesa.');
          return false;
        }

        await fetchData();
        toast.success(`Mesa ${numeroNormalizado} criada com sucesso!`);
        return true;
      } catch (error) {
        console.error(error);
        toast.error('Erro ao criar mesa.');
        return false;
      }
    },
    [fetchData, mesas]
  );

  const addMesasEmLote = useCallback(
    async ({
      inicial,
      final,
      prefixoNome,
      garcomNome,
    }: {
      inicial: number;
      final: number;
      prefixoNome?: string;
      garcomNome?: string;
    }) => {
      try {
        const ini = Number(inicial);
        const fim = Number(final);

        if (!ini || !fim || ini <= 0 || fim <= 0 || fim < ini) {
          toast.error('Informe um intervalo válido.');
          return false;
        }

        const { data: mesasExistentes, error: existingError } = await supabase
          .from('mesas')
          .select('numero');

        if (existingError) {
          console.error('Erro ao buscar mesas existentes:', existingError);
          toast.error('Não foi possível validar as mesas existentes.');
          return false;
        }

        const numerosExistentes = new Set(
          (mesasExistentes ?? []).map((m: any) => Number(m.numero))
        );

        const rows = [];

        for (let numero = ini; numero <= fim; numero++) {
          if (!numerosExistentes.has(numero)) {
            rows.push({
              numero,
              nome: prefixoNome?.trim()
                ? `${prefixoNome.trim()} ${numero}`
                : `Mesa ${numero}`,
              status: 'livre',
              garcom_nome: garcomNome?.trim() || null,
              ativa: true,
            });
          }
        }

        if (rows.length === 0) {
          toast.error('Todas essas mesas já existem.');
          return false;
        }

        const { error } = await supabase.from('mesas').insert(rows);

        if (error) {
          console.error('Erro ao criar mesas em lote:', error);
          toast.error('Não foi possível criar as mesas.');
          return false;
        }

        await fetchData();
        toast.success(`${rows.length} mesa(s) criada(s) com sucesso!`);
        return true;
      } catch (error) {
        console.error(error);
        toast.error('Erro ao criar mesas em lote.');
        return false;
      }
    },
    [fetchData]
  );

  const updateMesa = useCallback(
    async (mesa: Mesa) => {
      const { error } = await supabase
        .from('mesas')
        .update({
          numero: mesa.numero,
          nome: mesa.nome ?? `Mesa ${mesa.numero}`,
          status: mesa.status,
          garcom_nome: mesa.garcomNome ?? null,
          ativa: mesa.ativa ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mesa.id);

      if (error) {
        console.error('Erro ao atualizar mesa:', error);
        toast.error('Não foi possível atualizar a mesa.');
        return;
      }

      await fetchMesas();
      toast.success('Mesa atualizada!');
    },
    [fetchMesas]
  );

  const deleteMesa = useCallback(
    async (mesaId: string) => {
      const hasOpenOrder = orders.some(
        (order) =>
          String(order.mesaId) === String(mesaId) && order.status !== 'paid'
      );

      if (hasOpenOrder) {
        toast.error('Não é possível excluir uma mesa com consumo em aberto.');
        return;
      }

      try {
        const { error: unlinkError } = await supabase
          .from('pedidos')
          .update({ mesa_id: null })
          .eq('mesa_id', mesaId);

        if (unlinkError) {
          console.error('Erro ao desvincular pedidos da mesa:', unlinkError);
          toast.error('Não foi possível desvincular o histórico da mesa.');
          return;
        }

        const { error: deleteError } = await supabase
          .from('mesas')
          .delete()
          .eq('id', mesaId);

        if (deleteError) {
          console.error('Erro ao excluir mesa:', deleteError);
          toast.error('Não foi possível excluir a mesa.');
          return;
        }

        await fetchData();
        toast.success('Mesa excluída!');
      } catch (error) {
        console.error('Erro ao excluir mesa:', error);
        toast.error('Não foi possível excluir a mesa.');
      }
    },
    [fetchData, orders]
  );

  const getTodayOrders = () =>
    orders.filter((o) => {
      const orderDate = new Date(o.createdAt).toDateString();
      const today = new Date().toDateString();
      const isToday = orderDate === today;
      const isNotFinished = o.status !== 'paid';

      return isToday || isNotFinished;
    });

 const getArchivedOrders = (startDate: Date, endDate: Date) =>
  orders
    .filter((o) => {
      const date = new Date(o.createdAt);
      return date >= startDate && date <= endDate;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  return (
    <AppContext.Provider
      value={{
        orders,
        products,
        users,
        categories,
        mesas,
        orderCounter: orders.length + 1,
        fetchUsers,
        fetchMesas,
        fetchData,
        addOrder,
        updateOrder,
        appendItemsToOrder,
        updateOrderItem,
        deleteOrderItem,
        moveOrder,
        deleteOrder,
        payOrder,
        payOrdersBulk,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addUser,
        deleteUser,
        addMesa,
        addMesasEmLote,
        updateMesa,
        deleteMesa,
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