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

  // 1. Busca o profissional correspondente usando o e-mail do usuário autenticado
  const { data: profissional, error: profError } = await supabase
    .from('agenda_profissionais')
    .select('empresa_id')
    .eq('email', user.email)
    .eq('status', 'ativo')
    .limit(1)
    .single();

  if (profError || !profissional?.empresa_id) {
    throw { 
      statusCode: 404, 
      publicMessage: 'Usuario nao vinculado a nenhuma empresa.', 
      message: profError?.message || 'Nenhum profissional ativo encontrado com este email.' 
    };
  }

  // 2. Com o empresa_id em mãos, busca os dados de configuração da empresa
  const { data: perfil, error: perfilError } = await supabase
    .from('agenda_empresas')
    .select('id, horario_abertura, horario_fechamento, intervalo_ativo, intervalo_inicio, intervalo_fim, dom, seg, ter, qua, qui, sex, sab')
    .eq('id', profesional.empresa_id)
    .single();

  if (perfilError || !perfil) {
    throw { statusCode: 404, publicMessage: 'Empresa nao configurada.', message: perfilError?.message || 'Perfil da empresa nao encontrado.' };
  }

  return { 
    supabase, 
    user, 
    empresaId: perfil.id, 
    empresa: perfil 
  };
}
