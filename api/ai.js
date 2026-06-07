import { createAuthenticatedContext } from './ai/auth.js';
import { interpretIntent } from './ai/intent.js';
import { executeAction } from './ai/actions.js';
import { executeQuery } from './ai/queries.js';
import { getDashboardStats } from './ai/statistics.js';

function readMessage(req) {
  if (req.method === 'GET') return String(req.query?.message || req.query?.q || '').trim();
  return String(req.body?.message || req.body?.prompt || req.body?.text || '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metodo nao permitido.' });
  }

  try {
    const context = await createAuthenticatedContext(req);
    const payload = req.method === 'POST' && req.body && typeof req.body === 'object' ? req.body : {};
    
    // ── ETAPA 1: Busca Dinâmica de Profissionais e Serviços Ativos no Supabase ──
    // Executa em paralelo usando Promise.all para máxima performance sem travar a requisição
    const [profissionaisRes, servicosRes] = await Promise.all([
      context.supabase
        ? context.supabase
            .from('profissionais')
            .select('id, nome')
            .eq('empresa_id', context.empresa.id)
            .eq('ativo', true)
        : { data: [] },
      context.supabase
        ? context.supabase
            .from('servicos')
            .select('id, nome, duracao, preco')
            .eq('empresa_id', context.empresa.id)
            .eq('ativo', true)
        : { data: [] }
    ]);

    // Monta as listas limpas obtidas diretamente do banco de dados
    const listaProfissionais = profissionaisRes.data || [];
    const listaServicos = servicosRes.data || [];

    // Adiciona as listas reais de profissionais e serviços dentro do payload de contexto enviado ao interpretador
    const contextData = {
      ...payload,
      listaProfissionais,
      listaServicos
    };

    // Invoca o interpretIntent injetando os dados reais e atualizados do banco de dados
    const intent = interpretIntent(readMessage(req), contextData);

    // ── CLARIFICATION — retorna pergunta sem executar nada ──────────────────
    if (intent.domain === 'clarification') {
      return res.status(200).json({
        success: true,
        intent,
        answer: intent.params.question,
        hint:   intent.params.hint || '',
        empresa: {
          id:   context.empresa.id,
          nome: context.empresa.nome,
          slug: context.empresa.slug
        }
      });
    }

    // ── demais domains ──────────────────────────────────────────────────────
    const result = intent.domain === 'dashboard'
      ? await getDashboardStats(context, intent)
      : intent.domain === 'action'
        ? await executeAction(context, intent)
        : await executeQuery(context, intent);

    return res.status(200).json({
      success: true,
      intent,
      empresa: {
        id:   context.empresa.id,
        nome: context.empresa.nome,
        slug: context.empresa.slug
      },
      ...result
    });

  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      error:   error.publicMessage || 'Erro ao processar solicitacao.',
      details: status >= 500 ? undefined : error.message
    });
  }
}
