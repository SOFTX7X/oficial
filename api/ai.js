import { createClient } from '@supabase/supabase-js';

// Inicialização do Supabase com variáveis de ambiente do backend
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, error: 'Mensagem nao informada.' });

    // 1. Autenticação Integrada
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'Nao autorizado. Token ausente.' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ success: false, error: 'Sessao expirada ou usuario invalido.' });

    const text = message.toLowerCase();
    let resultData = null;
    let type = 'action';

    // 2. Processamento de Estatísticas / Painel Integrado
    if (text.includes('painel') || text.includes('resumo') || text.includes('estatistica')) {
      type = 'statistics';
      const { data: appointments } = await supabase.from('appointments').select('*');
      const { data: clients } = await supabase.from('clients').select('*');
      resultData = { totalAppointments: appointments?.length || 0, totalClients: clients?.length || 0 };

    // 3. Processamento de Relatórios / Consultas Integradas
    } else if (text.includes('melhor cliente') || text.includes('relatorio') || text.includes('faturamento')) {
      type = 'query';
      const { data: revenue } = await supabase.from('financial').select('value');
      const total = revenue?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;
      resultData = { totalRevenue: total, queryMessage: "Relatorio gerado com sucesso." };

    // 4. Processamento de Agendamentos / Ações Integradas (CRUD)
    } else {
      type = 'action';
      // Extração simplificada de dados para teste direto
      const parsedDate = new Date();
      parsedDate.setDate(parsedDate.getDate() + 1); // Amanhã
      const dateString = parsedDate.toISOString().split('T')[0];

      const { data: newAppointment, error: insertError } = await supabase
        .from('appointments')
        .insert([{
          user_id: user.id,
          client_name: "Cliente Teste IA",
          professional: "João",
          date: dateString,
          time: "14:00",
          status: "pending"
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      resultData = { message: "Agendamento pré-processado com sucesso", appointment: newAppointment };
    }

    return res.status(200).json({ success: true, type, data: resultData });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erro interno no processamento unificado.',
      details: error.message
    });
  }
}
