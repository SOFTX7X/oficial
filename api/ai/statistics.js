import { todayISO } from './utils.js';

async function countRows(supabase, table, empresaId, build = query => query) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId);
  query = build(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function getStatistics({ supabase, empresaId }, intent = { params: {} }) {
  const hoje = todayISO(0);
  const amanha = todayISO(1);
  const ignoreInString = '(Recusado,Excluido,Excluído,excluido)';
  const ignoreStatusList = ['Recusado', 'Excluido', 'Excluído', 'excluido'];

  const [
    clientes,
    profissionais,
    servicos,
    agendamentos,
    agendamentosHoje,
    agendamentosAmanha,
    pendentes,
    confirmados,
    faturamentoRows
  ] = await Promise.all([
    countRows(supabase, 'agenda_clientes',      empresaId, q => q.eq('status', 'ativo')),
    countRows(supabase, 'agenda_profissionais',  empresaId, q => q.eq('status', 'ativo')),
    countRows(supabase, 'agenda_servicos',       empresaId, q => q.eq('status', 'ativo')),
    countRows(supabase, 'agenda_agendamentos',   empresaId, q => q.not('status', 'in', ignoreInString)),
    countRows(supabase, 'agenda_agendamentos',   empresaId, q => q.eq('data', hoje).not('status', 'in', ignoreInString)),
    countRows(supabase, 'agenda_agendamentos',   empresaId, q => q.eq('data', amanha).not('status', 'in', ignoreInString)),
    countRows(supabase, 'agenda_agendamentos',   empresaId, q => q.eq('status', 'Pendente')),
    countRows(supabase, 'agenda_agendamentos',   empresaId, q => q.eq('status', 'Confirmado')),
    supabase.from('agenda_agendamentos').select('valor, status, data').eq('empresa_id', empresaId)
  ]);

  if (faturamentoRows.error) throw faturamentoRows.error;

  const rows = (faturamentoRows.data || []).filter(row => !ignoreStatusList.includes(row.status));
  const faturamentoTotal = rows.reduce((total, row) => total + Number(row.valor || 0), 0);
  const mesAtual = hoje.slice(0, 7);
  const faturamentoMes = rows
    .filter(row => row.data?.startsWith(mesAtual))
    .reduce((total, row) => total + Number(row.valor || 0), 0);

  const data = {
    clientes,
    profissionais,
    servicos,
    agendamentos,
    agendamentos_hoje:   agendamentosHoje,
    agendamentos_amanha: agendamentosAmanha,
    pendentes,
    confirmados,
    faturamento:     faturamentoTotal,
    faturamento_mes: faturamentoMes
  };

  const metric = intent?.params?.metric;
  return {
    answer: metric
      ? formatMetric(metric, data[metric])
      : 'Resumo do painel calculado com dados reais da empresa.',
    data: metric ? { [metric]: data[metric] } : data
  };
}

function formatMetric(metric, value) {
  if (metric === 'faturamento') {
    return `Seu faturamento total e de R$ ${Number(value || 0).toFixed(2)}.`;
  }
  if (metric === 'faturamento_mes') {
    return `Seu faturamento do mes atual e de R$ ${Number(value || 0).toFixed(2)}.`;
  }
  const labels = {
    clientes:            'clientes ativos',
    profissionais:       'profissionais ativos',
    servicos:            'servicos ativos',
    agendamentos:        'agendamentos no total',
    agendamentos_hoje:   'agendamentos hoje',
    agendamentos_amanha: 'agendamentos amanha',
    pendentes:           'agendamentos pendentes',
    confirmados:         'agendamentos confirmados'
  };
  return `Voce tem ${value || 0} ${labels[metric] || metric}.`;
}
