import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.URL_SUPABASE || 'https://wyjrjioipqfltdyupfna.supabase.co';
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PkDkt5S-_rdrT0HhANoPAw_ZWluV2_H';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const cleanText = (value, max) => String(value || '').trim().slice(0, max);
const readBody = req => {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
};
const sendJson = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
};
const client = key => createClient(SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function emailExists(admin, email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = Array.isArray(data?.users) ? data.users : [];
    if (users.some(user => normalizeEmail(user?.email) === email)) return true;
    if (users.length < 1000) return false;
  }
  throw new Error('USER_LIST_LIMIT_REACHED');
}

function signupError(error) {
  const value = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (value.includes('already')) return { status: 409, message: 'Este e-mail já possui uma conta.' };
  if (value.includes('rate limit') || value.includes('too many')) return { status: 429, message: 'Muitas tentativas. Aguarde um pouco e tente novamente.' };
  if (value.includes('password')) return { status: 400, message: 'A senha não atende aos requisitos de segurança.' };
  return { status: Number(error?.status) || 400, message: 'Não foi possível criar a conta. Confira os dados e tente novamente.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const body = readBody(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const nome = cleanText(body.nome, 100);

  if (!nome || !email || !password) return sendJson(res, 400, { error: 'Preencha nome, e-mail e senha.' });
  if (!EMAIL_PATTERN.test(email)) return sendJson(res, 400, { error: 'Digite um endereço de e-mail válido.' });
  if (password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return sendJson(res, 400, { error: 'Use pelo menos 8 caracteres, incluindo uma letra e um número.' });
  }
  if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY || !SUPABASE_PUBLIC_KEY) {
    return sendJson(res, 503, { error: 'O cadastro não está configurado corretamente no servidor.' });
  }

  try {
    const admin = client(SUPABASE_ADMIN_KEY);
    if (await emailExists(admin, email)) return sendJson(res, 409, { error: 'Este e-mail já possui uma conta.' });

    const { data, error } = await client(SUPABASE_PUBLIC_KEY).auth.signUp({
      email,
      password,
      options: { data: { nome } }
    });
    if (error) {
      const translated = signupError(error);
      return sendJson(res, translated.status, { error: translated.message });
    }
    if (!data?.user) return sendJson(res, 502, { error: 'O serviço não concluiu o cadastro. Tente novamente.' });
    return sendJson(res, 200, { data: { user: data.user, session: data.session || null } });
  } catch (error) {
    console.error('[auth-signup]', error);
    return sendJson(res, 500, { error: 'O serviço de cadastro está temporariamente indisponível.' });
  }
}
