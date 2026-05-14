import type { DeliveryStatus, Order, OrderStatus } from './types';

type LockableOrder = Pick<Order, 'status' | 'paid' | 'statusEntrega'>;

export function isOrderLockedForChanges(order: Partial<LockableOrder> | null | undefined) {
  if (!order) return false;

  const deliveryStatus = order.statusEntrega as DeliveryStatus | undefined;
  const orderStatus = order.status as OrderStatus | undefined;

  return Boolean(
    order.paid ||
      orderStatus === 'paid' ||
      deliveryStatus === 'rota' ||
      deliveryStatus === 'finalizado'
  );
}

export function getOrderLockedMessage(order: Partial<LockableOrder> | null | undefined) {
  if (order?.paid || order?.status === 'paid' || order?.statusEntrega === 'finalizado') {
    return 'Pedido finalizado nao pode ser editado ou excluido.';
  }

  if (order?.statusEntrega === 'rota') {
    return 'Pedido em rota de entrega nao pode ser editado ou excluido.';
  }

  return 'Este pedido nao pode ser editado ou excluido.';
}
