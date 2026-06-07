import { getSupabaseAdmin } from './supabase.js';

function bearer(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export async function createAuthenticatedContext(req) {
  const token = bearer(req);
  if (!token) {
    const error = new Error('Token ausente.');
    error.statusCode = 401;
    error.publicMessage = 'Usuario nao autenticado.';
    throw error;
  }

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    const error = new Error(userError?.message || 'Sessao invalida.');
    error.statusCode = 401;
    error.publicMessage = 'Sessao invalida ou expirada.';
    throw error;
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('agenda_perfis')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (perfilError || !perfil?.empresa_id) {
    const error = new Error(perfilError?.message || 'Perfil sem empresa.');
    error.statusCode = 403;
    error.publicMessage = 'Perfil sem acesso a uma empresa.';
    throw error;
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('agenda_empresas')
    .select('*')
    .eq('id', perfil.empresa_id)
    .single();

  if (empresaError || !empresa) {
    const error = new Error(empresaError?.message || 'Empresa nao encontrada.');
    error.statusCode = 403;
    error.publicMessage = 'Empresa nao encontrada para este usuario.';
    throw error;
  }

  // Retorna o contexto incluindo a requisição (req) para blindagem de rotas e query strings
  return { supabase, user, perfil, empresa, empresaId: perfil.empresa_id, req };
}
