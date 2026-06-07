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

  // 1. Busca o perfil pelo auth_user_id (fluxo correto original)
  const { data: perfis, error: perfilError } = await supabase
    .from('agenda_perfis')
    .select('empresa_id')
    .eq('auth_user_id', user.id)
    .limit(1);

  if (perfilError || !perfis || perfis.length === 0) {
    throw {
      statusCode: 404,
      publicMessage: 'Perfil nao encontrado para este usuario.',
      message: perfilError?.message || 'Nenhum perfil encontrado com este auth_user_id.'
    };
  }

  const empresaIdFinal = perfis[0].empresa_id;

  // 2. Busca as configuracoes da empresa vinculada
  const { data: empresas, error: empresaError } = await supabase
    .from('agenda_empresas')
    .select('id, nome, segmento, horario_abertura, horario_fechamento, intervalo_ativo, intervalo_inicio, intervalo_fim, dom, seg, ter, qua, qui, sex, sab')
    .eq('id', empresaIdFinal)
    .limit(1);

  if (empresaError || !empresas || empresas.length === 0) {
    throw {
      statusCode: 404,
      publicMessage: 'Empresa nao configurada.',
      message: empresaError?.message || 'Empresa nao encontrada.'
    };
  }

  return {
    supabase,
    user,
    empresaId: empresas[0].id,
    empresa: empresas[0]
  };
}
