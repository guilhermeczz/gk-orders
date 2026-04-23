export type OrderStatus = 'new' | 'preparing' | 'ready' | 'paid';

export type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  batchId?: string;
  batchNotes?: string;
  createdAt?: string | Date;
}

export interface OrderBatch {
  id: string;
  items: OrderItem[];
  notes?: string;
  createdAt: string | Date;
  isAdditional: boolean;
}

export interface Order {
  id: string;
  number: number;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string | Date;
  notes?: string;
  paid?: boolean;
  paymentMethod?: PaymentMethod;
  itemBatches?: OrderBatch[];
  paidAt?: string | Date;
  cashSessionId?: number | null;
  amountReceived?: number | null;
  changeGiven?: number | null;
  createdBy?: string | null;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  active?: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
}