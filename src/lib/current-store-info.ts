import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  getCurrentStoreId,
  subscribeToCurrentStoreChange,
} from './current-store';

export type CurrentStoreInfo = {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  ativa: boolean;
};

export function useCurrentStoreInfo() {
  const [storeId, setStoreId] = useState(() => getCurrentStoreId());
  const [storeInfo, setStoreInfo] = useState<CurrentStoreInfo | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);

  // Escuta as mudanças de loja (Ex: Quando o usuário troca de loja ou faz login)
  useEffect(() => {
    const unsubscribe = subscribeToCurrentStoreChange((nextStoreId) => {
      setStoreId(nextStoreId);
    });

    return unsubscribe;
  }, []);

  // Busca os dados da loja selecionada no Supabase
  useEffect(() => {
    let active = true;

    const fetchStore = async () => {
      // OTIMIZAÇÃO: Se não tiver ID de loja, não gasta requisição à toa no banco!
      if (!storeId) {
        if (active) {
          setStoreInfo(null);
          setLoadingStore(false);
        }
        return;
      }

      setLoadingStore(true);

      const { data, error } = await supabase
        .from('lojas')
        .select('id, nome, slug, plano, ativa')
        .eq('id', storeId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error('Erro ao buscar loja atual:', error);
        setStoreInfo(null);
        setLoadingStore(false);
        return;
      }

      if (!data) {
        setStoreInfo(null);
        setLoadingStore(false);
        return;
      }

      setStoreInfo({
        id: String(data.id),
        nome: data.nome,
        slug: data.slug,
        plano: data.plano,
        ativa: data.ativa,
      });

      setLoadingStore(false);
    };

    fetchStore();

    return () => {
      active = false;
    };
  }, [storeId]);

  return {
    storeId,
    storeInfo,
    loadingStore,
  };
}