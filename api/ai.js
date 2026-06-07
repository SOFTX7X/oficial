import { createAuthenticatedContext } from './ai/auth.js';
import { interpretIntent } from './ai/intent.js';
import { formatWithGemini } from './ai/gemini.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { message, history, slotState } = req.body || {};

    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensagem nao informada.' });
    }

    // 1. Autenticação e montagem do contexto da empresa
    const context = await createAuthenticatedContext(req);

    // 2. Processa a intenção com histórico e estado do slot filling
    const result = await interpretIntent(context, message, {
      ...req.body,
      history: history || [],
      slotState: slotState || null
    });

    // 3. Formata a resposta com Gemini Flash (nível gratuito)
    const formattedAnswer = await formatWithGemini(
      result.answer,
      result.data || null,
      result.type || 'query'
    );

    return res.status(200).json({
      success: true,
      ...result,
      answer: formattedAnswer
    });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.publicMessage || 'Erro ao processar solicitacao.',
      details: error.message
    });
  }
}
