import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, error: 'Mensagem nao informada.' });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'Nao autorizado. Token ausente.' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ success: false, error: 'Sessao expirada.' });

    const text = message.toLowerCase();
    let resultData = null;
    let type = 'action';

    // Nome exato obtido da imagem do seu Supabase
    const tableName = 'agenda_agendamentos'; 

    if (text.includes('painel') || text.includes('resumo') || text.includes('estatistica')) {
      type = 'statistics';
      const { data: agendamentos } = await supabase.from(tableName).select('*');
      resultData = { totalAppointments: agendamentos?.length || 0, tableNameUsed: tableName };

    } else if (text.includes('melhor cliente') || text.includes('relatorio') || text.includes('faturamento')) {
      type = 'query';
      resultData = { message: "Consulta executada com sucesso.", tableNameUsed: tableName };

    } else {
      type = 'action';
      const parsedDate = new Date();
      parsedDate.setDate(parsedDate.getDate() + 1);
      const dateString = parsedDate.toISOString().split('T')[0];

      // Insert adaptado para a tabela real 'agenda_agendamentos'
      const { data: newAppointment, error: insertError } = await supabase
        .from(tableName)
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

      // Se der erro de coluna específica (ex: se na tabela o campo for 'eu_ia' ou 'id_usuario'),
      // o catch vai reportar o nome exato da coluna que precisamos ajustar.
      if (insertError) throw insertError;
      resultData = { message: "Agendamento gravado com sucesso", appointment: newAppointment, tableNameUsed: tableName };
    }

    return res.status(200).json({ success: true, type, data: resultData });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erro de execução no banco de dados.',
      details: error.message
    });
  }
}
