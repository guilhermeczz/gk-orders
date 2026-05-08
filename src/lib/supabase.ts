import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// OTIMIZAÇÃO: Trava de segurança para evitar que o sistema "quebre" no deploy
// caso as variáveis de ambiente não tenham sido configuradas corretamente.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Atenção: Variáveis de ambiente do Supabase não encontradas no arquivo .env!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)