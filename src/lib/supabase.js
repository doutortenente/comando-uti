import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idswehsvvqczzkiatuzu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_AQUI';

if (!supabaseAnonKey || supabaseAnonKey === 'SUA_CHAVE_AQUI') {
  console.warn('⚠️ SUPABASE_ANON_KEY não encontrada! Verifique o ficheiro .env na raiz do projeto frontend.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
