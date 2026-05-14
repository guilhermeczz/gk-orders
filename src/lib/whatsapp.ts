import type { Order } from '@/lib/types';

export type WhatsappMessageKind = 'pickup-ready' | 'delivery-out';

export function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function buildWhatsappUrl(phone: string, message: string) {
  const digits = onlyDigits(phone);
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function getWhatsappSentKey(orderId: string, kind: WhatsappMessageKind) {
  return `gk-orders:whatsapp-sent:${kind}:${orderId}`;
}

export function isWhatsappMessageSent(orderId: string, kind: WhatsappMessageKind) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(getWhatsappSentKey(orderId, kind)) === 'true';
}

export function setWhatsappMessageSent(orderId: string, kind: WhatsappMessageKind, sent: boolean) {
  if (typeof window === 'undefined') return;

  const key = getWhatsappSentKey(orderId, kind);
  if (sent) {
    window.localStorage.setItem(key, 'true');
  } else {
    window.localStorage.removeItem(key);
  }
}

export function buildPickupReadyMessage(
  order: Pick<Order, 'number' | 'customerName' | 'items' | 'paid' | 'statusPagamento' | 'paymentMethod' | 'metadataDelivery' | 'total'>
) {
  const orderNumber = String(order.number || 0).padStart(4, '0');
  const name = order.customerName || 'cliente';

  return [
    `Olá, ${name}! Seu pedido #${orderNumber} está pronto para retirada.`,
    '',
    buildOrderItemsText(order),
    '',
    buildOrderPaymentText(order),
    '',
    'Pode vir buscar quando quiser.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildDeliveryOutMessage(
  order: Pick<Order, 'number' | 'customerName' | 'items' | 'paid' | 'statusPagamento' | 'paymentMethod' | 'metadataDelivery' | 'total'>
) {
  const orderNumber = String(order.number || 0).padStart(4, '0');
  const name = order.customerName || 'cliente';

  return [
    `Olá, ${name}! Seu pedido #${orderNumber} saiu para entrega.`,
    '',
    buildOrderItemsText(order),
    '',
    buildOrderPaymentText(order),
    '',
    'Fique de olho, ele já está a caminho.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildOrderItemsText(order: Pick<Order, 'items'>) {
  const items = order.items ?? [];
  if (items.length === 0) return '';

  const lines = items.map((item) => {
    const additions = item.additions ?? [];
    const additionsText =
      additions.length > 0
        ? ` (${additions.map((addition) => `+ ${addition.quantity}x ${addition.productName}`).join(', ')})`
        : '';

    return `- ${item.quantity}x ${item.productName}${additionsText}`;
  });

  return ['Itens do pedido:', ...lines].join('\n');
}

function buildOrderPaymentText(
  order: Pick<Order, 'paid' | 'statusPagamento' | 'paymentMethod' | 'metadataDelivery' | 'total'>
) {
  const total = formatMoney(Number(order.total || 0));
  const method = order.paymentMethod || order.metadataDelivery?.formaPagamento || '';
  const methodText = method ? ` (${getPaymentMethodLabel(method)})` : '';

  if (order.paid || order.statusPagamento === 'pago') {
    return `Pagamento: já pago${methodText}\nTotal: ${total}`;
  }

  const changeText =
    method === 'dinheiro' && order.metadataDelivery?.trocoPara
      ? `\nTroco para: ${formatMoney(Number(order.metadataDelivery.trocoPara || 0))}`
      : '';

  return `Pagamento: a cobrar${methodText}\nTotal: ${total}${changeText}`;
}

function getPaymentMethodLabel(method: string) {
  const normalized = String(method || '').toLowerCase();
  if (normalized === 'dinheiro') return 'Dinheiro';
  if (normalized === 'pix') return 'PIX';
  if (normalized === 'credito' || normalized === 'crédito') return 'Crédito';
  if (normalized === 'debito' || normalized === 'débito') return 'Débito';
  return method;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}
