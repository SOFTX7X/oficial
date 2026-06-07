import { createClient } from '@supabase/supabase-js';
import { executeAction } from './actions.js';
import { runQuery } from './queries.js';
import { getStatistics } from './statistics.js';

// Inicialização direta do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, error: 'Mensagem nao informada.' });

    // Autenticação integrada (substitui o auth.js)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Nao autorizado. Token ausente.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Sessao expirada ou usuario nao encontrado.' });
    }

    const context = { supabase, user };
    const text = message.toLowerCase();

    // Roteamento de intenções integrado (substitui o intent.js)
    let result;
    if (text.includes('painel') || text.includes('resumo') || text.includes('estatistica')) {
      const stats = await getStatistics(context);
      result = { type: 'statistics', data: stats };
    } else if (text.includes('melhor cliente') || text.includes('relatorio') || text.includes('faturamento')) {
      const queryResult = await runQuery(context, text);
      result = { type: 'query', data: queryResult };
    } else {
      const actionResult = await executeAction(context, message, req.body);
      result = { type: 'action', data: actionResult };
    }

    return res.status(200).json({ success: true, ...result });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.publicMessage || 'Erro ao processar solicitacao.',
      details: error.message
    });
  }
}
