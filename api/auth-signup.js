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
const PER_PAGE = 1000;
const MAX_PAGES = 100;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
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

function createServerClient(key) {
  return createClient(SUPABASE_URL, key, {
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

function translateSignupError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (
    code.includes('user_already_exists') ||
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already registered')
  ) {
    return {
      status: 409,
      message: 'Este e-mail já possui uma conta.'
    };
  }

  if (message.includes('password')) {
    return {
      status: 400,
      message: 'A senha informada não atende aos requisitos de segurança.'
    };
  }

  if (message.includes('email')) {
    return {
      status: 400,
      message: 'O endereço de e-mail informado não é válido.'
    };
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return {
      status: 429,
      message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    };
  }

  return {
    status: Number(error?.status) || 400,
    message: 'Não foi possível criar a conta. Confira os dados e tente novamente.'
  };
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
  const password = String(body.password || '');
  const nome = cleanText(body.nome, 100);

  if (!nome || !email || !password) {
    return sendJson(res, 400, {
      error: 'Preencha nome, e-mail e senha.'
    });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return sendJson(res, 400, {
      error: 'Digite um endereço de e-mail válido.'
    });
  }

  if (password.length < 6) {
    return sendJson(res, 400, {
      error: 'A senha deve ter pelo menos 6 caracteres.'
    });
  }

  if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY || !SUPABASE_PUBLIC_KEY) {
    return sendJson(res, 503, {
      error: 'O cadastro ainda não está configurado corretamente no servidor.'
    });
  }

  try {
    const admin = createServerClient(SUPABASE_ADMIN_KEY);

    if (await emailExists(admin, email)) {
      return sendJson(res, 409, {
        error: 'Este e-mail já possui uma conta.'
      });
    }

    const supabase = createServerClient(SUPABASE_PUBLIC_KEY);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome }
      }
    });

    if (error) {
      const translated = translateSignupError(error);
      return sendJson(res, translated.status, {
        error: translated.message
      });
    }

    const identities = data?.user?.identities;

    if (data?.user && Array.isArray(identities) && identities.length === 0) {
      return sendJson(res, 409, {
        error: 'Este e-mail já possui uma conta.'
      });
    }

    if (!data?.user) {
      return sendJson(res, 502, {
        error: 'O Supabase não concluiu o cadastro. Tente novamente.'
      });
    }

    return sendJson(res, 200, {
      data: {
        user: data.user,
        session: data.session || null
      }
    });
  } catch (error) {
    console.error('[auth-signup]', error);

    return sendJson(res, 500, {
      error: 'O serviço de cadastro está temporariamente indisponível.'
    });
  }
}
