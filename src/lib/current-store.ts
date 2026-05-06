export const DEFAULT_LOJA_ID = '00000000-0000-0000-0000-000000000001';

const CURRENT_STORE_KEY = 'gk_orders_current_store_id';
const CURRENT_STORE_EVENT = 'gk-orders-current-store-changed';

export function getCurrentStoreId() {
  if (typeof window === 'undefined') {
    return DEFAULT_LOJA_ID;
  }

  return localStorage.getItem(CURRENT_STORE_KEY) || DEFAULT_LOJA_ID;
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
        lojaId: DEFAULT_LOJA_ID,
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

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === CURRENT_STORE_KEY) {
      callback(event.newValue || DEFAULT_LOJA_ID);
    }
  };

  window.addEventListener(CURRENT_STORE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CURRENT_STORE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}