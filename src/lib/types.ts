export type OrderStatus = 'new' | 'preparing' | 'ready' | 'paid';
export type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';

export interface OrderItemAddition {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  batchId?: string;
  batchNotes?: string;
  createdAt?: string | Date;
  additions?: OrderItemAddition[];
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
  mesaId?: string | null;
  loja_id?: string; // <-- Adicionado para o multiloja
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  loja_id?: string; // <-- Adicionado para o multiloja
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  active?: boolean;
  loja_id?: string; // <-- Adicionado para o multiloja
}

export interface User {
  id: string;
  name: string;
  username: string;
  active?: boolean;
  loja_id?: string; // <-- Adicionado para o multiloja
}

export interface Mesa {
  id: string;
  numero: number;
  nome?: string | null;
  status: 'livre' | 'ocupada';
  garcomNome?: string | null;
  ativa?: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  loja_id?: string; // <-- Adicionado para o multiloja
}