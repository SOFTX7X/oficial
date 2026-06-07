import { todayISO } from './utils.js';

async function countRows(supabase, table, empresaId, build = query => query) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId);
  query = build(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

function fmt(v) { return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

export async function getStatistics({ supabase, empresaId }, intent = { params: {} }) {
  const hoje = todayISO(0);
  const amanha = todayISO(1);
  const ignoreInString = '(Recusado,Excluido,Excluído,excluido)';
  const ignoreStatusList = ['Recusado', 'Excluido', 'Excluído', 'excluido'];

  const metric = intent?.params?.metric;

  // ── Métricas com lista detalhada ──────────────────────────────────────────
  if (metric === 'clientes') {
    const { data, error } = await supabase
      .from('agenda_clientes')
      .select('nome, telefone')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });
    if (error) throw error;
    const total = data?.length || 0;
    if (!total) return { answer: 'Nenhum cliente ativo cadastrado ainda.', data: { clientes: 0 } };
    const lista = data.map(c => `• ${c.nome}${c.telefone ? ` (${c.telefone})` : ''}`).join('\n');
    return {
      answer: `Você tem ${total} cliente${total !== 1 ? 's' : ''} ativo${total !== 1 ? 's' : ''}:\n\n${lista}`,
      data: { clientes: total }
    };
  }

  if (metric === 'profissionais') {
    const { data, error } = await supabase
      .from('agenda_profissionais')
      .select('nome, especialidade')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });
    if (error) throw error;
    const total = data?.length || 0;
    if (!total) return { answer: 'Nenhum profissional ativo cadastrado ainda.', data: { profissionais: 0 } };
    const lista = data.map(p => `• ${p.nome}${p.especialidade ? ` — ${p.especialidade}` : ''}`).join('\n');
    return {
      answer: `Você tem ${total} profissional${total !== 1 ? 'is' : ''} ativo${total !== 1 ? 's' : ''}:\n\n${lista}`,
      data: { profissionais: total }
    };
  }

  if (metric === 'servicos') {
    const { data, error } = await supabase
      .from('agenda_servicos')
      .select('nome, preco, duracao_minutos')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });
    if (error) throw error;
    const total = data?.length || 0;
    if (!total) return { answer: 'Nenhum serviço ativo cadastrado ainda.', data: { servicos: 0 } };
    const lista = data.map(s => `• ${s.nome} — ${fmt(s.preco)}${s.duracao_minutos ? `, ${s.duracao_minutos}min` : ''}`).join('\n');
    return {
      answer: `Você tem ${total} serviço${total !== 1 ? 's' : ''} ativo${total !== 1 ? 's' : ''}:\n\n${lista}`,
      data: { servicos: total }
    };
  }

  if (metric === 'agendamentos_hoje') {
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('cliente_nome, hora, servico_nome, profissional_nome, status')
      .eq('empresa_id', empresaId)
      .eq('data', hoje)
      .not('status', 'in', ignoreInString)
      .order('hora', { ascending: true });
    if (error) throw error;
    const total = data?.length || 0;
    if (!total) return { answer: `Nenhum agendamento para hoje (${hoje}).`, data: { agendamentos_hoje: 0 } };
    const lista = data.map(a =>
      `• ${a.hora?.slice(0,5)} — ${a.cliente_nome}${a.servico_nome ? ` (${a.servico_nome})` : ''}${a.profissional_nome ? ` com ${a.profissional_nome}` : ''} [${a.status}]`
    ).join('\n');
    return {
      answer: `${total} agendamento${total !== 1 ? 's' : ''} para hoje (${hoje}):\n\n${lista}`,
      data: { agendamentos_hoje: total }
    };
  }

  if (metric === 'agendamentos_amanha') {
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('cliente_nome, hora, servico_nome, profissional_nome, status')
      .eq('empresa_id', empresaId)
      .eq('data', amanha)
      .not('status', 'in', ignoreInString)
      .order('hora', { ascending: true });
    if (error) throw error;
    const total = data?.length || 0;
    if (!total) return { answer: `Nenhum agendamento para amanhã (${amanha}).`, data: { agendamentos_amanha: 0 } };
    const lista = data.map(a =>
      `• ${a.hora?.slice(0,5)} — ${a.cliente_nome}${a.servico_nome ? ` (${a.servico_nome})` : ''}${a.profissional_nome ? ` com ${a.profissional_nome}` : ''} [${a.status}]`
    ).join('\n');
    return {
      answer: `${total} agendamento${total !== 1 ? 's' : ''} para amanhã (${amanha}):\n\n${lista}`,
      data: { agendamentos_amanha: total }
    };
  }

  if (metric === 'agendamentos') {
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('cliente_nome, data, hora, status')
      .eq('empresa_id', empresaId)
      .not('status', 'in', ignoreInString)
      .order('data', { ascending: false })
      .limit(10);
    if (error) throw error;
    const { count } = await supabase
      .from('agenda_agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .not('status', 'in', ignoreInString);
    const total = count || 0;
    if (!total) return { answer: 'Nenhum agendamento registrado ainda.', data: { agendamentos: 0 } };
    const lista = (data || []).map(a =>
      `• ${a.data} ${a.hora?.slice(0,5)} — ${a.cliente_nome} [${a.status}]`
    ).join('\n');
    return {
      answer: `Você tem ${total} agendamento${total !== 1 ? 's' : ''} no total. Últimos registros:\n\n${lista}`,
      data: { agendamentos: total }
    };
  }

  if (metric === 'pendentes') {
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('cliente_nome, data, hora, servico_nome')
      .eq('empresa_id', empresaId)
      .eq('status', 'Pendente')
      .order('data', { ascending: true });
    if (error) throw error;
    const total = data?.length || 0;
    if (!total) return { answer: 'Nenhum agendamento pendente no momento. ✅', data: { pendentes: 0 } };
    const lista = data.map(a =>
      `• ${a.data} ${a.hora?.slice(0,5)} — ${a.cliente_nome}${a.servico_nome ? ` (${a.servico_nome})` : ''}`
    ).join('\n');
    return {
      answer: `${total} agendamento${total !== 1 ? 's' : ''} pendente${total !== 1 ? 's' : ''} aguardando aprovação:\n\n${lista}`,
      data: { pendentes: total }
    };
  }

  if (metric === 'confirmados') {
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('cliente_nome, data, hora, servico_nome')
      .eq('empresa_id', empresaId)
      .eq('status', 'Confirmado')
      .order('data', { ascending: true });
    if (error) throw error;
    const total = data?.length || 0;
    if (!total) return { answer: 'Nenhum agendamento confirmado no momento.', data: { confirmados: 0 } };
    const lista = data.map(a =>
      `• ${a.data} ${a.hora?.slice(0,5)} — ${a.cliente_nome}${a.servico_nome ? ` (${a.servico_nome})` : ''}`
    ).join('\n');
    return {
      answer: `${total} agendamento${total !== 1 ? 's' : ''} confirmado${total !== 1 ? 's' : ''}:\n\n${lista}`,
      data: { confirmados: total }
    };
  }

  // ── Painel completo ───────────────────────────────────────────────────────
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
    clientes, profissionais, servicos, agendamentos,
    agendamentos_hoje:   agendamentosHoje,
    agendamentos_amanha: agendamentosAmanha,
    pendentes, confirmados,
    faturamento:     faturamentoTotal,
    faturamento_mes: faturamentoMes
  };

  return {
    answer: [
      `📊 Resumo do seu negócio:`,
      ``,
      `👥 Clientes ativos: ${clientes}`,
      `👤 Profissionais: ${profissionais}`,
      `✦ Serviços: ${servicos}`,
      ``,
      `📅 Agendamentos hoje: ${agendamentosHoje}`,
      `📅 Agendamentos amanhã: ${agendamentosAmanha}`,
      `⏳ Pendentes: ${pendentes}`,
      `✅ Confirmados: ${confirmados}`,
      ``,
      `💰 Faturamento do mês: ${fmt(faturamentoMes)}`,
      `💰 Faturamento total: ${fmt(faturamentoTotal)}`,
    ].join('\n'),
    data
  };
}
