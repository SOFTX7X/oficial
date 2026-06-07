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

    // 1. Contexto autenticado
    let context;
    try {
      context = await createAuthenticatedContext(req);
    } catch (authErr) {
      console.error('[VyXora IA] Auth error:', authErr.message || authErr);
      return res.status(authErr.statusCode || 401).json({
        success: false,
        error: authErr.publicMessage || 'Erro de autenticação.'
      });
    }

    // 2. Gemini decide o que fazer
    let geminiResult;
    try {
      geminiResult = await callGemini(context, message, history || []);
    } catch (geminiErr) {
      console.error('[VyXora IA] Gemini error:', geminiErr.message || geminiErr);
      return res.status(200).json({
        success: true,
        type: 'chat',
        answer: 'Desculpe, tive um problema ao pensar na resposta. Tente novamente.'
      });
    }

    // 3. Conversa, suporte, conteúdo ou slot filling — responde direto
    if (geminiResult.type === 'chat' || geminiResult.type === 'slot_filling') {
      return res.status(200).json({
        success: true,
        type: geminiResult.type,
        answer: geminiResult.answer,
        slotState: null
      });
    }

    // 4. Ação no painel — executa
    if (geminiResult.type === 'action') {
      const { action, params } = geminiResult;

      try {
        // Consultas de estatísticas
        if (action === 'query_stats') {
          const stats = await getStatistics(context, { params: { metric: params.metric } });
          return res.status(200).json({
            success: true,
            type: 'statistics',
            answer: stats.answer,
            data: stats.data,
            slotState: null
          });
        }

        // Consultas livres
        if (action === 'query_data') {
          const queryResult = await runQuery(context, params.query || message);
          return res.status(200).json({
            success: true,
            type: 'query',
            answer: queryResult.answer,
            data: queryResult.data,
            slotState: null
          });
        }

        // CRUD
        const result = await executeAction(context, { name: action, params });
        return res.status(200).json({
          success: true,
          type: 'action',
          answer: result.answer,
          data: result.data,
          slotState: null
        });

      } catch (actionErr) {
        console.error('[VyXora IA] Action error:', action, actionErr.message || actionErr);
        return res.status(200).json({
          success: true,
          type: 'error',
          answer: actionErr.publicMessage || 'Não consegui executar essa ação. Verifique os dados e tente novamente.',
          slotState: null
        });
      }
    }

    // Fallback
    return res.status(200).json({
      success: true,
      type: 'chat',
      answer: geminiResult.answer || 'Não entendi. Pode repetir?',
      slotState: null
    });

  } catch (error) {
    console.error('[VyXora IA] Erro geral:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar solicitação.',
      details: error?.message
    });
  }
}
