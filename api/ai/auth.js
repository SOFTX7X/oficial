import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function createAuthenticatedContext(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw { statusCode: 401, publicMessage: 'Nao autorizado.', message: 'Token ausente.' };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw { statusCode: 401, publicMessage: 'Sessao expirada.', message: error?.message || 'Usuario nao encontrado.' };
  }

  return { supabase, user };
}
