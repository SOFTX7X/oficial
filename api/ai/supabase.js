import { createClient } from '@supabase/supabase-js';

// Cache global da instância do cliente Supabase para reutilização entre funções serverless
let supabaseInstance = null;

export function getSupabaseAdmin() {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.URL_SUPABASE || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const error = new Error('Variaveis do Supabase ausentes.');
    error.statusCode = 500;
    error.publicMessage = 'Configuracao do servidor incompleta.';
    throw error;
  }

  supabaseInstance = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return supabaseInstance;
}
