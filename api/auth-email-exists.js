import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.URL_SUPABASE ||
  'https://wyjrjioipqfltdyupfna.supabase.co';

const SUPABASE_ADMIN_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PER_PAGE = 1000;
const MAX_PAGES = 100;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;

  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
}

function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY) {
    throw new Error('SUPABASE_ADMIN_NOT_CONFIGURED');
  }

  return createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

async function emailExists(admin, email) {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE
    });

    if (error) throw error;

    const users = Array.isArray(data?.users) ? data.users : [];
    const found = users.some((user) => normalizeEmail(user?.email) === email);

    if (found) return true;
    if (users.length < PER_PAGE) return false;
  }

  throw new Error('USER_LIST_LIMIT_REACHED');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, {
      error: 'Método não permitido.'
    });
  }

  const body = readJsonBody(req);
  const email = normalizeEmail(body.email);

  if (!EMAIL_PATTERN.test(email)) {
    return sendJson(res, 400, {
      error: 'Digite um endereço de e-mail válido.'
    });
  }

  try {
    const admin = createAdminClient();
    const exists = await emailExists(admin, email);

    return sendJson(res, 200, { exists });
  } catch (error) {
    console.error('[auth-email-exists]', error);

    if (error?.message === 'SUPABASE_ADMIN_NOT_CONFIGURED') {
      return sendJson(res, 503, {
        error: 'A verificação de e-mail não está configurada no servidor.'
      });
    }

    return sendJson(res, 500, {
      error: 'Não foi possível verificar o e-mail agora. Tente novamente.'
    });
  }
}
