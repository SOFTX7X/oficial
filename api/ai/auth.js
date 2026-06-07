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

  // Busca a empresa vinculada ao usuário logado usando o campo correto (eu_ia)
  const { data: perfil, error: perfilError } = await supabase
    .from('agenda_empresas')
    .select('id, horario_abertura, horario_fechamento, intervalo_ativo, intervalo_inicio, intervalo_fim, dom, seg, ter, qua, qui, sex, sab')
    .eq('eu_ia', user.id)
    .single();

  if (perfilError || !perfil) {
    throw { statusCode: 404, publicMessage: 'Empresa nao configurada.', message: perfilError?.message || 'Perfil nao encontrado.' };
  }

  // Retorna o contexto exato que o actions.js e as queries esperam receber
  return { 
    supabase, 
    user, 
    empresaId: perfil.id, 
    empresa: perfil 
  };
}
