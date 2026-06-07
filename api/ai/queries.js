import { normalizeText, todayISO, timeFromMinutes, minutesFromTime, parseDate } from './utils.js';

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.publicMessage = message;
  throw error;
}

// ─── Detecta qual consulta fazer baseado no texto livre ──────────────────────
function detectQueryIntent(text) {
  const t = normalizeText(typeof text === 'string' ? text : text?.name || '');

  if (matchAny(t, ['melhor cliente', 'cliente mais frequente', 'cliente que mais agenda', 'top cliente']))
    return { name: 'best_client', params: {} };

  if (matchAny(t, ['melhor profissional', 'profissional mais ocupado', 'top profissional', 'profissional com mais']))
    return { name: 'top_professional', params: {} };

  if (matchAny(t, ['servico mais', 'servico popular', 'servico mais pedido', 'top servico', 'mais agendado']))
    return { name: 'top_service', params: {} };

  if (matchAny(t, ['horario livre', 'horarios disponiveis', 'hora livre', 'quando tem', 'tem vaga', 'disponibilidade']))
    return { name: 'free_slots', params: { data: parseDate(text) || todayISO(0) } };

  if (matchAny(t, ['cliente inativo', 'clientes sem agendamento', 'clientes inativos', 'quem nao agenda']))
    return { name: 'inactive_clients', params: {} };

  if (matchAny(t, ['pendente', 'aguardando', 'pendentes', 'fila de espera', 'aprovar']))
    return { name: 'pending_appointments', params: {} };

  if (matchAny(t, ['agendamento de hoje', 'agenda de hoje', 'agenda do dia', 'hoje tem', 'compromissos de hoje']))
    return { name: 'today_appointments', params: {} };

  if (matchAny(t, ['faturamento', 'receita', 'ganho', 'lucro', 'quanto ganhei', 'quanto faturei', 'relatorio financeiro']))
    return { name: 'revenue', params: {} };

  return null;
}

function matchAny(text, terms) {
  return terms.some(term => text.includes(normalizeText(term)));
}

// ─── Entry point principal ───────────────────────────────────────────────────
export async function runQuery(context, intent) {
  // Aceita string (texto livre) ou objeto { name, params }
  const resolved = typeof intent === 'string' ? detectQueryIntent(intent) : intent;

  if (!resolved) {
    return { answer: 'Nao entendi o que voce quer consultar. Tente perguntar sobre agendamentos, clientes ou faturamento.' };
  }

  const handlers = {
    best_client: getBestClient,
    top_professional: getTopProfessional,
    top_service: getTopService,
    free_slots: getFreeSlots,
    inactive_clients: getInactiveClients,
    pending_appointments: getPendingAppointments,
    today_appointments: getTodayAppointments,
    revenue: getRevenue
  };

  const handler = handlers[resolved.name];
  if (!handler) return { answer: 'Consulta nao reconhecida. Tente perguntar de outra forma.' };

  return handler(context, resolved.params || {});
}

// ─── Melhor cliente ──────────────────────────────────────────────────────────
async function getBestClient({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('cliente_nome')
    .eq('empresa_id', empresaId)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum agendamento encontrado para analisar.' };

  const counts = {};
  data.forEach(row => { counts[row.cliente_nome] = (counts[row.cliente_nome] || 0) + 1; });

  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return {
    answer: `O seu melhor cliente e ${best[0]}, com ${best[1]} agendamentos realizados.`,
    data: { cliente: best[0], quantidade: best[1] }
  };
}

// ─── Top profissional ────────────────────────────────────────────────────────
async function getTopProfessional({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('profissional_nome')
    .eq('empresa_id', empresaId)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum profissional com agendamentos registrados.' };

  const counts = {};
  data.forEach(row => {
    if (row.profissional_nome) counts[row.profissional_nome] = (counts[row.profissional_nome] || 0) + 1;
  });

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return {
    answer: `O profissional mais ocupado e ${top[0]}, com ${top[1]} agendamentos.`,
    data: { profissional: top[0], quantidade: top[1] }
  };
}

// ─── Top serviço ─────────────────────────────────────────────────────────────
async function getTopService({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('servico_nome')
    .eq('empresa_id', empresaId)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum servico foi agendado ate o momento.' };

  const counts = {};
  data.forEach(row => {
    if (row.servico_nome) counts[row.servico_nome] = (counts[row.servico_nome] || 0) + 1;
  });

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return {
    answer: `O servico mais procurado e "${top[0]}", agendado ${top[1]} vezes.`,
    data: { servico: top[0], quantidade: top[1] }
  };
}

// ─── Horários livres ─────────────────────────────────────────────────────────
async function getFreeSlots({ supabase, empresa, empresaId }, params) {
  const dataAlvo = params.data || todayISO(0);

  let profQuery = supabase.from('agenda_profissionais').select('*').eq('empresa_id', empresaId).eq('ativo', true);
  let profissional;

  if (params.profissional_nome) {
    const normName = normalizeText(params.profissional_nome);
    const { data: profs } = await profQuery;
    profissional = (profs || []).find(p => normalizeText(p.nome).includes(normName));
  } else {
    profissional = (await profQuery.limit(1)).data?.[0];
  }

  if (!profissional) return { answer: 'Nenhum profissional ativo encontrado para checar horarios.' };

  const weekday = new Date(`${dataAlvo}T00:00:00`).getDay();
  const dayFields = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  if (empresa?.[dayFields[weekday]] === false) {
    return { answer: `A empresa nao abre nesta data (${dataAlvo}).` };
  }

  const { data: ocupados, error } = await supabase
    .from('agenda_agendamentos')
    .select('hora')
    .eq('empresa_id', empresaId)
    .eq('profissional_id', profissional.id)
    .eq('data', dataAlvo)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');

  if (error) throw error;

  const horasOcupadas = (ocupados || []).map(o => o.hora.slice(0, 5));
  const inicio = minutesFromTime(empresa?.horario_abertura || '08:00');
  const fim = minutesFromTime(empresa?.horario_fechamento || '18:00');
  const breakInicio = empresa?.intervalo_ativo ? minutesFromTime(empresa.intervalo_inicio || '12:00') : -1;
  const breakFim = empresa?.intervalo_ativo ? minutesFromTime(empresa.intervalo_fim || '13:00') : -1;

  const livres = [];
  for (let min = inicio; min < fim; min += 60) {
    if (min >= breakInicio && min < breakFim) continue;
    const horarioStr = timeFromMinutes(min);
    if (!horasOcupadas.includes(horarioStr)) livres.push(horarioStr);
  }

  if (livres.length === 0) {
    return { answer: `${profissional.nome} nao possui horarios livres em ${dataAlvo}.` };
  }

  return {
    answer: `Horarios livres para ${profissional.nome} no dia ${dataAlvo}: ${livres.join(', ')}.`,
    data: { profissional: profissional.nome, data: dataAlvo, horarios_livres: livres }
  };
}

// ─── Clientes inativos ───────────────────────────────────────────────────────
async function getInactiveClients({ supabase, empresaId }) {
  const [clientesRes, agendamentosRes] = await Promise.all([
    supabase.from('agenda_clientes').select('id, nome').eq('empresa_id', empresaId),
    supabase.from('agenda_agendamentos').select('cliente_id').eq('empresa_id', empresaId)
      .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)')
  ]);

  if (clientesRes.error) throw clientesRes.error;
  if (agendamentosRes.error) throw agendamentosRes.error;

  const ativosIds = new Set((agendamentosRes.data || []).map(a => a.cliente_id));
  const inativos = (clientesRes.data || []).filter(c => !ativosIds.has(c.id));

  if (!inativos.length) return { answer: 'Todos os seus clientes possuem agendamentos ativos!' };

  const nomes = inativos.map(c => c.nome).slice(0, 10).join(', ');
  return {
    answer: `Encontrei ${inativos.length} clientes inativos. Exemplos: ${nomes}.`,
    data: { total_inativos: inativos.length, lista: inativos.map(c => c.nome) }
  };
}

// ─── Agendamentos pendentes ──────────────────────────────────────────────────
async function getPendingAppointments({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('id, cliente_nome, data, hora, servico_nome')
    .eq('empresa_id', empresaId)
    .eq('status', 'Pendente')
    .order('data', { ascending: true });

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum agendamento pendente de aprovacao.' };

  const lista = data.map(a =>
    `${a.cliente_nome} (${a.servico_nome || 'Geral'}) no dia ${a.data} as ${a.hora}`
  ).join('; ');

  return {
    answer: `Voce tem ${data.length} agendamentos pendentes: ${lista}.`,
    data: { total_pendentes: data.length, agendamentos: data }
  };
}

// ─── Agendamentos de hoje ────────────────────────────────────────────────────
async function getTodayAppointments({ supabase, empresaId }) {
  const hoje = todayISO(0);
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('id, cliente_nome, hora, servico_nome, profissional_nome, status')
    .eq('empresa_id', empresaId)
    .eq('data', hoje)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)')
    .order('hora', { ascending: true });

  if (error) throw error;
  if (!data?.length) return { answer: `Nao ha agendamentos para hoje (${hoje}).` };

  const lista = data.map(a =>
    `${a.hora.slice(0, 5)} - ${a.cliente_nome} (${a.servico_nome || 'Geral'}) com ${a.profissional_nome || 'profissional'}`
  ).join('; ');

  return {
    answer: `Agendamentos de hoje (${hoje}): ${lista}.`,
    data: { total: data.length, agendamentos: data }
  };
}

// ─── Faturamento ─────────────────────────────────────────────────────────────
async function getRevenue({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('valor, data')
    .eq('empresa_id', empresaId)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum dado de faturamento encontrado.' };

  const total = data.reduce((sum, row) => sum + Number(row.valor || 0), 0);
  const hoje = todayISO(0);
  const mesAtual = hoje.slice(0, 7);
  const totalMes = data
    .filter(row => row.data?.startsWith(mesAtual))
    .reduce((sum, row) => sum + Number(row.valor || 0), 0);

  return {
    answer: `Faturamento total: R$ ${total.toFixed(2)}. Faturamento do mes atual: R$ ${totalMes.toFixed(2)}.`,
    data: { total_geral: total, total_mes: totalMes }
  };
}
