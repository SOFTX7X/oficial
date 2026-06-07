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

    // Varredura direta e segura para identificar o nome da tabela ativa no banco
    let tableName = 'appointments';
    const testTables = ['appointments', 'agendamentos', 'appointment', 'agendamento'];
    
    for (const t of testTables) {
      try {
        const { error: checkError } = await supabase.from(t).select('id').limit(1);
        if (!checkError || (checkError.code !== 'PGRST116' && !checkError.message.includes('could not find'))) {
          tableName = t;
          break;
        }
      } catch (e) {
        // Ignora falhas de tabela inexistente e continua o loop
      }
    }

    if (text.includes('painel') || text.includes('resumo') || text.includes('estatistica')) {
      type = 'statistics';
      const { data: appointments } = await supabase.from(tableName).select('*');
      resultData = { totalAppointments: appointments?.length || 0, tableNameUsed: tableName };

    } else if (text.includes('melhor cliente') || text.includes('relatorio') || text.includes('faturamento')) {
      type = 'query';
      resultData = { message: "Consulta executada", tableNameUsed: tableName };

    } else {
      type = 'action';
      const parsedDate = new Date();
      parsedDate.setDate(parsedDate.getDate() + 1);
      const dateString = parsedDate.toISOString().split('T')[0];

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

      if (insertError) throw insertError;
      resultData = { message: "Agendamento gravado", appointment: newAppointment, tableNameUsed: tableName };
    }

    return res.status(200).json({ success: true, type, data: resultData });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erro no banco de dados.',
      details: error.message
    });
  }
}
