import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.URL_SUPABASE ||
  'https://wyjrjioipqfltdyupfna.supabase.co';

const SUPABASE_ADMIN_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

const SUPABASE_PUBLIC_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_PkDkt5S-_rdrT0HhANoPAw_ZWluV2_H';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_RESPONSE = {
  accepted: true,
  message: 'Se este e-mail estiver cadastrado, o código será enviado.'
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
}

function createServerClient(key) {
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = Array.isArray(data?.users) ? data.users : [];
    const user = users.find(item => normalizeEmail(item?.email) === email);
    if (user) return user;
    if (users.length < 1000) return null;
  }
  throw new Error('USER_LIST_LIMIT_REACHED');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const email = normalizeEmail(readJsonBody(req).email);
  if (!EMAIL_PATTERN.test(email)) {
    return sendJson(res, 400, { error: 'Digite um endereço de e-mail válido.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY || !SUPABASE_PUBLIC_KEY) {
    return sendJson(res, 503, { error: 'A recuperação não está configurada no servidor.' });
  }

  try {
    const admin = createServerClient(SUPABASE_ADMIN_KEY);
    const user = await findUserByEmail(admin, email);

    // A resposta é idêntica para contas existentes e inexistentes. Assim a rota
    // só envia para usuários reais sem permitir enumeração de e-mails.
    if (!user) return sendJson(res, 200, GENERIC_RESPONSE);

    const auth = createServerClient(SUPABASE_PUBLIC_KEY);
    const { error } = await auth.auth.resetPasswordForEmail(email);
    if (error) console.error('[auth-recovery-request:provider]', error);

    return sendJson(res, 200, GENERIC_RESPONSE);
  } catch (error) {
    console.error('[auth-recovery-request]', error);
    return sendJson(res, 503, { error: 'A recuperação está temporariamente indisponível.' });
  }
}
