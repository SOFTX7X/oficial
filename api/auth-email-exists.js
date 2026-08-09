import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.URL_SUPABASE || 'https://wyjrjioipqfltdyupfna.supabase.co';
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = value => String(value || '').trim().toLowerCase();

function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

async function emailExists(admin, email) {
  // A etapa inicial precisa responder rápido. Contas concluídas sempre possuem
  // perfil; a rota final de cadastro continua consultando o Auth como garantia.
  const { data, error } = await admin
    .from('agenda_perfis')
    .select('id')
    .eq('email', email)
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const email = normalizeEmail(readBody(req).email);
  if (!EMAIL_PATTERN.test(email)) return sendJson(res, 400, { error: 'Digite um endereço de e-mail válido.' });
  if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY) {
    return sendJson(res, 503, { error: 'Não foi possível verificar o e-mail agora.' });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return sendJson(res, 200, { exists: await emailExists(admin, email) });
  } catch (error) {
    console.error('[auth-email-exists]', error);
    return sendJson(res, 503, { error: 'Não foi possível verificar o e-mail agora.' });
  }
}
