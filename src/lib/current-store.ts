const CURRENT_STORE_KEY = 'gk_orders_current_store_id';
const CURRENT_STORE_EVENT = 'gk-orders-current-store-changed';

// OTIMIZAÇÃO: Sem ID "chumbado" de fallback. Se não tem loja, é vazio. Segurança em 1º lugar.
export function getCurrentStoreId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem(CURRENT_STORE_KEY) || '';
}

export function setCurrentStoreId(lojaId: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CURRENT_STORE_KEY, lojaId);

  window.dispatchEvent(
    new CustomEvent(CURRENT_STORE_EVENT, {
      detail: {
        lojaId,
      },
    })
  );
}

export function clearCurrentStoreId() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CURRENT_STORE_KEY);

  window.dispatchEvent(
    new CustomEvent(CURRENT_STORE_EVENT, {
      detail: {
        lojaId: '',
      },
    })
  );
}

export function subscribeToCurrentStoreChange(callback: (lojaId: string) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{ lojaId?: string }>;
    callback(customEvent.detail?.lojaId || getCurrentStoreId());
  };

  // Mantém abas diferentes do navegador sincronizadas
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === CURRENT_STORE_KEY) {
      callback(event.newValue || '');
    }
  };

  window.addEventListener(CURRENT_STORE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CURRENT_STORE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}