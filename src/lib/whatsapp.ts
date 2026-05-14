import type { Order } from '@/lib/types';

export function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function buildWhatsappUrl(phone: string, message: string) {
  const digits = onlyDigits(phone);
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildPickupReadyMessage(order: Pick<Order, 'number' | 'customerName'>) {
  const orderNumber = String(order.number || 0).padStart(4, '0');
  const name = order.customerName || 'cliente';

  return `Olá, ${name}! Seu pedido #${orderNumber} está pronto para retirada. Pode vir buscar quando quiser.`;
}

export function buildDeliveryOutMessage(order: Pick<Order, 'number' | 'customerName'>) {
  const orderNumber = String(order.number || 0).padStart(4, '0');
  const name = order.customerName || 'cliente';

  return `Olá, ${name}! Seu pedido #${orderNumber} saiu para entrega. Fique de olho, ele já está a caminho.`;
}
