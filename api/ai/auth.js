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

  // Limpa o email da sessão para evitar espaços em branco
  const userEmail = String(user.email || '').trim();

  // 1. Busca o profissional usando ilike para ignorar maiúsculas/minúsculas
  const { data: profissionais, error: profError } = await supabase
    .from('agenda_profissionais')
    .select('empresa_id')
    .ilike('email', userEmail)
    .eq('status', 'ativo')
    .limit(1);

  if (profError || !profissionais || profissionais.length === 0) {
    throw { 
      statusCode: 404, 
      publicMessage: `Usuario (${userEmail}) nao vinculado a nenhuma empresa.`, 
      message: profError?.message || 'Nenhum profissional ativo encontrado com este email.' 
    };
  }

  const empresaIdFinal = profissionais[0].empresa_id;

  // 2. Busca as configurações da empresa vinculada
  const { data: empresas, error: perfilError } = await supabase
    .from('agenda_empresas')
    .select('id, horario_abertura, horario_fechamento, intervalo_ativo, intervalo_inicio, intervalo_fim, dom, seg, ter, qua, qui, sex, sab')
    .eq('id', empresaIdFinal)
    .limit(1);

  if (perfilError || !empresas || empresas.length === 0) {
    throw { statusCode: 404, publicMessage: 'Empresa nao configurada.', message: perfilError?.message || 'Perfil da empresa nao encontrado.' };
  }

  return { 
    supabase, 
    user, 
    empresaId: empresas[0].id, 
    empresa: empresas[0] 
  };
}
