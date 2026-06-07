import { createAuthenticatedContext } from './ai/auth.js';
import { executeAction } from './ai/actions.js';
import { runQuery } from './ai/queries.js';
import { getStatistics } from './ai/statistics.js';
import { callGemini } from './ai/gemini.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { message, history } = req.body || {};

    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensagem não informada.' });
    }

    // 1. Monta contexto autenticado (empresa, supabase, etc)
    const context = await createAuthenticatedContext(req);

    // 2. Gemini decide o que fazer
    const geminiResult = await callGemini(context, message, history || []);

    // 3. Se for conversa, suporte ou conteúdo — responde direto
    if (geminiResult.type === 'chat' || geminiResult.type === 'slot_filling') {
      return res.status(200).json({
        success: true,
        type: geminiResult.type,
        answer: geminiResult.answer
      });
    }

    // 4. Se for ação no painel — executa
    if (geminiResult.type === 'action') {
      const { action, params, answer: confirmMsg } = geminiResult;

      try {
        // Consultas de estatísticas
        if (action === 'query_stats') {
          const stats = await getStatistics(context, { params: { metric: params.metric } });
          return res.status(200).json({
            success: true,
            type: 'statistics',
            answer: stats.answer,
            data: stats.data
          });
        }

        // Consultas livres de dados
        if (action === 'query_data') {
          const queryResult = await runQuery(context, params.query || '');
          return res.status(200).json({
            success: true,
            type: 'query',
            answer: queryResult.answer,
            data: queryResult.data
          });
        }

        // Ações de CRUD (criar, editar, cancelar, etc)
        const result = await executeAction(context, { name: action, params });
        return res.status(200).json({
          success: true,
          type: 'action',
          answer: result.answer,
          data: result.data
        });

      } catch (actionError) {
        return res.status(200).json({
          success: true,
          type: 'error',
          answer: actionError.publicMessage || 'Não consegui executar essa ação. Verifique os dados e tente novamente.'
        });
      }
    }

    // Fallback
    return res.status(200).json({
      success: true,
      type: 'chat',
      answer: geminiResult.answer || 'Não entendi. Pode reformular?'
    });

  } catch (error) {
    console.error('[VyXora IA] Erro geral:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.publicMessage || 'Erro ao processar solicitação.',
      details: error.message
    });
  }
}
