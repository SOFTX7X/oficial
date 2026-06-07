import { activeStatus, todayISO } from './utils.js';

async function countRows(supabase, table, empresaId, build = query => query) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId);
  query = build(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function getDashboardStats({ supabase, empresaId }, intent = { params: {} }) {
  const hoje = todayISO(0);
  const amanha = todayISO(1);
  
  // Lista de status ignorados em consultas
  const ignoreStatusList = ['Recusado', 'Excluido', 'Excluído', 'excluido'];

  const [clientes, profissionais, servicos, agendamentos, agendamentosHoje, agendamentosAmanha, faturamentoRows] = await Promise.all([
    countRows(supabase, 'agenda_clientes', empresaId, activeStatus),
    countRows(supabase, 'agenda_profissionais', empresaId, q => q.eq('ativo', true)),
    countRows(supabase, 'agenda_servicos', empresaId, q => q.eq('ativo', true)),
    countRows(supabase, 'agenda_agendamentos', empresaId, q => q.not('status', 'in', `(${ignoreStatusList.map(s => `"${s}"`).join(',')})`)),
    countRows(supabase, 'agenda_agendamentos', empresaId, q => q.eq('data', hoje).not('status', 'in', `(${ignoreStatusList.map(s => `"${s}"`).join(',')})`)),
    countRows(supabase, 'agenda_agendamentos', empresaId, q => q.eq('data', amanha).not('status', 'in', `(${ignoreStatusList.map(s => `"${s}"`).join(',')})`)),
    supabase.from('agenda_agendamentos').select('valor,status').eq('empresa_id', empresaId)
  ]);
  
  if (faturamentoRows.error) throw faturamentoRows.error;

  const faturamento = (faturamentoRows.data || [])
    .filter(row => !ignoreStatusList.includes(row.status))
    .reduce((total, row) => total + Number(row.valor || 0), 0);

  const data = { clientes, profissionais, servicos, agendamentos, agendamentos_hoje: agendamentosHoje, agendamentos_amanha: agendamentosAmanha, faturamento };
  const metric = intent.params?.metric;
  return { answer: metric ? formatMetric(metric, data[metric]) : 'Resumo do painel calculado com dados reais da empresa.', data: metric ? { [metric]: data[metric] } : data };
}

function formatMetric(metric, value) {
  if (metric === 'faturamento') return `Seu faturamento total baseado nos agendamentos e de R$ ${Number(value || 0).toFixed(2)}.`;
  const labels = { clientes: 'clientes', profissionais: 'profissionais', servicos: 'servicos', agendamentos: 'agendamentos', agendamentos_hoje: 'agendamentos hoje', agendamentos_amanha: 'agendamentos amanha' };
  return `Voce tem ${value || 0} ${labels[metric] || metric}.`;
}
