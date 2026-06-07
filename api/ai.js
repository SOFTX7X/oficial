import { createClient } from '@supabase/supabase-js';
import { createAuthenticatedContext } from './ai/auth.js';
import { interpretIntent } from './ai/intent.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, error: 'Mensagem nao informada.' });

    // 1. Autenticação usando o arquivo correto dentro de ./ai/auth.js
    const context = await createAuthenticatedContext(req);
    
    // 2. Processamento da intenção usando o arquivo correto dentro de ./ai/intent.js
    const result = await interpretIntent(context, message, req.body);
    
    return res.status(200).json({ success: true, ...result });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.publicMessage || 'Erro ao processar solicitacao.',
      details: error.message
    });
  }
}
