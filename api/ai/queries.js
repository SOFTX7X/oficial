import { normalizeText, todayISO, timeFromMinutes, minutesFromTime, parseDate } from './utils.js';

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.publicMessage = message;
  throw error;
}

function matchAny(text, terms) {
  return terms.some(term => text.includes(normalizeText(term)));
}

function detectQueryIntent(text) {
  const t = normalizeText(typeof text === 'string' ? text : text?.name || '');

  if (matchAny(t, ['listar clientes', 'ver clientes', 'mostrar clientes', 'todos os clientes', 'meus clientes']))
    return { name: 'list_clients', params: {} };

  if (matchAny(t, ['listar profissionais', 'ver profissionais', 'mostrar profissionais', 'todos os profissionais', 'meus profissionais']))
    return { name: 'list_professionals', params: {} };

  if (matchAny(t, ['listar servicos', 'ver servicos', 'mostrar servicos', 'todos os servicos', 'meus servicos']))
    return { name: 'list_services', params: {} };

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

  if (matchAny(t, ['clientes por periodo', 'clientes do mes', 'novos clientes', 'clientes em ', 'clientes de ']))
    return { name: 'clients_by_period', params: { text: typeof text === 'string' ? text : '' } };

  if (matchAny(t, ['faturamento por periodo', 'faturamento do mes', 'faturamento em ', 'receita do mes', 'receita por periodo', 'receita em ', 'quanto ganhei em ', 'quanto faturei em ']))
    return { name: 'revenue_by_period', params: { text: typeof text === 'string' ? text : '' } };

  if (matchAny(t, ['faturamento', 'receita', 'ganho', 'lucro', 'quanto ganhei', 'quanto faturei', 'relatorio financeiro']))
    return { name: 'revenue', params: {} };

  return null;
}

export async function executeQuery(context, intent) {
  // Aceita string (texto livre) ou objeto { name, params }
  const resolved = typeof intent === 'string' ? detectQueryIntent(intent) : intent;

  if (!resolved) {
    return { answer: 'Nao entendi o que voce quer consultar. Tente perguntar sobre agendamentos, clientes ou faturamento.' };
  }

  const handlers = {
    best_client:           getBestClient,
    top_professional:      getTopProfessional,
    top_service:           getTopService,
    free_slots:            getFreeSlots,
    inactive_clients:      getInactiveClients,
    pending_appointments:  getPendingAppointments,
    today_appointments:    getTodayAppointments,
    tomorrow_appointments: getTomorrowAppointments,
    revenue:               getRevenue,
    list_appointments:     listAllAppointments,
    list_clients:          listClients,
    list_professionals:    listProfessionals,
    list_services:         listServices,
    clients_by_period:     getClientsByPeriod,
    revenue_by_period:     getRevenueByPeriod,
    // ── intents de métricas vindas do intent.js ──────────────────────────────
    metric:                handleMetric,
  };

  const handler = handlers[resolved.name];
  if (!handler) return { answer: 'Consulta nao reconhecida. Tente perguntar de outra forma.' };

  return handler(context, resolved.params || {});
}

// Mantém compatibilidade com chamadas antigas via runQuery
export { executeQuery as runQuery };

// ─── Handler de métricas (quantos clientes, profissionais, etc.) ─────────────
async function handleMetric({ supabase, empresaId }, params) {
  const metric = params.metric || '';

  if (metric === 'clientes') {
    const { data, error } = await supabase
      .from('agenda_clientes')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');
    if (error) throw error;
    const total = data?.length || 0;
    return { answer: `Voce tem ${total} cliente${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}.` };
  }

  if (metric === 'profissionais') {
    const { data, error } = await supabase
      .from('agenda_profissionais')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');
    if (error) throw error;
    const total = data?.length || 0;
    return { answer: `Voce tem ${total} profissional${total !== 1 ? 'is' : ''} ativo${total !== 1 ? 's' : ''}.` };
  }

  if (metric === 'servicos') {
    const { data, error } = await supabase
      .from('agenda_servicos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');
    if (error) throw error;
    const total = data?.length || 0;
    return { answer: `Voce tem ${total} servico${total !== 1 ? 's' : ''} ativo${total !== 1 ? 's' : ''}.` };
  }

  if (metric === 'agendamentos_hoje') {
    const hoje = todayISO(0);
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('data', hoje)
      .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');
    if (error) throw error;
    const total = data?.length || 0;
    return { answer: `Voce tem ${total} agendamento${total !== 1 ? 's' : ''} para hoje.` };
  }

  if (metric === 'agendamentos_amanha') {
    const amanha = todayISO(1);
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('data', amanha)
      .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');
    if (error) throw error;
    const total = data?.length || 0;
    return { answer: `Voce tem ${total} agendamento${total !== 1 ? 's' : ''} para amanha.` };
  }

  if (metric === 'faturamento') {
    return getRevenue({ supabase, empresaId }, {});
  }

  if (metric === 'agendamentos') {
    const { data, error } = await supabase
      .from('agenda_agendamentos')
      .select('id')
      .eq('empresa_id', empresaId)
      .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');
    if (error) throw error;
    const total = data?.length || 0;
    return { answer: `Voce tem ${total} agendamento${total !== 1 ? 's' : ''} no total.` };
  }

  return { answer: 'Nao consegui identificar a metrica solicitada.' };
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
    answer: `⭐ Melhor cliente: ${best[0]}\n${best[1]} agendamento${best[1]!==1?'s':''} realizados.`,
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
    answer: `🏆 Profissional mais ocupado: ${top[0]}\n${top[1]} agendamento${top[1]!==1?'s':''} realizados.`,
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
    answer: `✦ Serviço mais popular: ${top[0]}\nAgendado ${top[1]} vez${top[1]!==1?'es':''}.`,
    data: { servico: top[0], quantidade: top[1] }
  };
}

// ─── Horários livres — CORRIGIDO: status em vez de ativo ────────────────────
async function getFreeSlots({ supabase, empresa, empresaId }, params) {
  const dataAlvo = params.data || todayISO(0);

  let profissional;

  if (params.profissional_nome) {
    const normName = normalizeText(params.profissional_nome);
    const { data: profs } = await supabase
      .from('agenda_profissionais')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');
    profissional = (profs || []).find(p => normalizeText(p.nome).includes(normName));
  } else {
    const { data: profs } = await supabase
      .from('agenda_profissionais')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .limit(1);
    profissional = profs?.[0];
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
  const linhas = inativos.slice(0, 15).map(c => `• ${c.nome}`).join('\n');
  return {
    answer: `😴 ${inativos.length} cliente${inativos.length!==1?'s':''} sem agendamentos:\n\n${linhas}${inativos.length > 15 ? `\n• ...e mais ${inativos.length - 15}` : ''}`,
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

  const linhas = data.map(a =>
    `• ${a.data} ${a.hora?.slice(0,5)} — ${a.cliente_nome}${a.servico_nome ? ` (${a.servico_nome})` : ''}`
  ).join('\n');
  return {
    answer: `⏳ ${data.length} agendamento${data.length!==1?'s':''} pendente${data.length!==1?'s':''} aguardando aprovação:\n\n${linhas}`,
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

  const linhas = data.map(a =>
    `• ${a.hora.slice(0, 5)} — ${a.cliente_nome}${a.servico_nome ? ` (${a.servico_nome})` : ''}${a.profissional_nome ? ` com ${a.profissional_nome}` : ''} [${a.status}]`
  ).join('\n');
  return {
    answer: `📅 ${data.length} agendamento${data.length!==1?'s':''} para hoje (${hoje}):\n\n${linhas}`,
    data: { total: data.length, agendamentos: data }
  };
}

// ─── Agendamentos de amanhã ──────────────────────────────────────────────────
async function getTomorrowAppointments({ supabase, empresaId }) {
  const amanha = todayISO(1);
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('id, cliente_nome, hora, servico_nome, profissional_nome, status')
    .eq('empresa_id', empresaId)
    .eq('data', amanha)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)')
    .order('hora', { ascending: true });

  if (error) throw error;
  if (!data?.length) return { answer: `Nao ha agendamentos para amanha (${amanha}).` };

  const lista = data.map(a =>
    `${a.hora.slice(0, 5)} - ${a.cliente_nome} (${a.servico_nome || 'Geral'}) com ${a.profissional_nome || 'profissional'}`
  ).join('; ');

  const linhas = data.map(a =>
    `• ${a.hora.slice(0, 5)} — ${a.cliente_nome}${a.servico_nome ? ` (${a.servico_nome})` : ''}${a.profissional_nome ? ` com ${a.profissional_nome}` : ''} [${a.status}]`
  ).join('\n');
  return {
    answer: `📅 ${data.length} agendamento${data.length!==1?'s':''} para amanhã (${amanha}):\n\n${linhas}`,
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

  const fmt = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  return {
    answer: `💰 Faturamento\n\n• Mês atual: ${fmt(totalMes)}\n• Total geral: ${fmt(total)}`,
    data: { total_geral: total, total_mes: totalMes }
  };
}

// ─── Listar agendamentos completos ───────────────────────────────────────────
async function listAllAppointments({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('id, cliente_nome, data, hora, servico_nome, profissional_nome, status')
    .eq('empresa_id', empresaId)
    .not('status', 'in', '(Excluido,Excluído,excluido)')
    .order('data', { ascending: false })
    .limit(20);

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum agendamento encontrado.' };

  const lista = data.map(a =>
    `${a.data} ${a.hora?.slice(0,5)} — ${a.cliente_nome} (${a.servico_nome || 'Geral'}) com ${a.profissional_nome || 'profissional'} [${a.status}]`
  ).join('; ');

  const linhas = data.map(a =>
    `• ${a.data} ${a.hora?.slice(0,5)} — ${a.cliente_nome} (${a.servico_nome || 'Geral'}) com ${a.profissional_nome || 'profissional'} [${a.status}]`
  ).join('\n');
  return {
    answer: `📋 Últimos ${data.length} agendamentos:\n\n${linhas}`,
    data: { total: data.length, agendamentos: data }
  };
}

// ─── Clientes por período ─────────────────────────────────────────────────────
async function getClientsByPeriod({ supabase, empresaId }, params) {
  const texto = String(params.text || '');
  const mesMatch = texto.match(/(\d{2})\/(\d{4})|(\d{4})-(\d{2})|(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
  let prefixo = todayISO(0).slice(0, 7);

  if (mesMatch) {
    if (mesMatch[1] && mesMatch[2]) {
      prefixo = `${mesMatch[2]}-${mesMatch[1]}`;
    } else if (mesMatch[3] && mesMatch[4]) {
      prefixo = `${mesMatch[3]}-${mesMatch[4]}`;
    } else if (mesMatch[5]) {
      const meses = {
        janeiro:'01', fevereiro:'02', marco:'03', abril:'04', maio:'05', junho:'06',
        julho:'07', agosto:'08', setembro:'09', outubro:'10', novembro:'11', dezembro:'12',
        jan:'01', fev:'02', mar:'03', abr:'04', mai:'05', jun:'06',
        jul:'07', ago:'08', set:'09', out:'10', nov:'11', dez:'12'
      };
      const ano = new Date().getFullYear();
      prefixo = `${ano}-${meses[mesMatch[5].toLowerCase()]}`;
    }
  }

  // Busca agendamentos no período e conta clientes únicos
  // Usa gte/lte pois a coluna 'data' é do tipo DATE (não suporta LIKE/~~)
  const dataInicio = `${prefixo}-01`;
  const [ano, mes] = prefixo.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${prefixo}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('cliente_id, cliente_nome')
    .eq('empresa_id', empresaId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');

  if (error) throw error;
  if (!data?.length) return { answer: `Nenhum cliente com agendamento em ${prefixo}.` };

  // Clientes únicos
  const vistos = new Set();
  const unicos = [];
  for (const row of data) {
    const key = row.cliente_id || row.cliente_nome;
    if (!vistos.has(key)) { vistos.add(key); unicos.push(row.cliente_nome); }
  }

  const nomes = unicos.slice(0, 10).join(', ');
  const linhas = unicos.slice(0, 15).map(n => `• ${n}`).join('\n');
  return {
    answer: `👥 ${unicos.length} cliente${unicos.length!==1?'s':''} com agendamento em ${prefixo}:\n\n${linhas}`,
    data: { total: unicos.length, periodo: prefixo, clientes: unicos }
  };
}

// ─── Faturamento por período ──────────────────────────────────────────────────
async function getRevenueByPeriod({ supabase, empresaId }, params) {
  const texto = String(params.text || '');
  const mesMatch = texto.match(/(\d{2})\/(\d{4})|(\d{4})-(\d{2})|(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
  let prefixo = todayISO(0).slice(0, 7);

  if (mesMatch) {
    if (mesMatch[1] && mesMatch[2]) {
      prefixo = `${mesMatch[2]}-${mesMatch[1]}`;
    } else if (mesMatch[3] && mesMatch[4]) {
      prefixo = `${mesMatch[3]}-${mesMatch[4]}`;
    } else if (mesMatch[5]) {
      const meses = { jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12' };
      const ano = new Date().getFullYear();
      prefixo = `${ano}-${meses[mesMatch[5].toLowerCase()]}`;
    }
  }

  // Usa gte/lte pois a coluna 'data' é do tipo DATE (não suporta LIKE/~~)
  const dataInicio = `${prefixo}-01`;
  const [ano, mes] = prefixo.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${prefixo}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('valor, data')
    .eq('empresa_id', empresaId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .not('status', 'in', '(Recusado,Excluido,Excluído,excluido)');

  if (error) throw error;
  if (!data?.length) return { answer: `Nenhum faturamento encontrado para o periodo ${prefixo}.` };

  const total = data.reduce((sum, row) => sum + Number(row.valor || 0), 0);
  const fmt2 = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  return {
    answer: `💰 Faturamento de ${prefixo}\n\n• Total: ${fmt2(total)}\n• Agendamentos: ${data.length}`,
    data: { periodo: prefixo, total, quantidade: data.length }
  };
}

// ─── Listar clientes ──────────────────────────────────────────────────────────
async function listClients({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_clientes')
    .select('id, nome, telefone, email, status')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })
    .limit(50);

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum cliente cadastrado ainda.' };

  const lista = data.map(c => `${c.nome}${c.telefone ? ' (' + c.telefone + ')' : ''}`).join(', ');
  const linhas = data.map(c => `• ${c.nome}${c.telefone ? ` (${c.telefone})` : ''}`).join('\n');
  return {
    answer: `👥 ${data.length} cliente${data.length!==1?'s':''} ativo${data.length!==1?'s':''}:\n\n${linhas}`,
    data: { total: data.length, clientes: data }
  };
}

// ─── Listar profissionais ─────────────────────────────────────────────────────
async function listProfessionals({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_profissionais')
    .select('id, nome, especialidade, telefone, status')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })
    .limit(50);

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum profissional cadastrado ainda.' };

  const lista = data.map(p => `${p.nome}${p.especialidade ? ' — ' + p.especialidade : ''}`).join(', ');
  const linhas = data.map(p => `• ${p.nome}${p.especialidade ? ` — ${p.especialidade}` : ''}`).join('\n');
  return {
    answer: `👤 ${data.length} profissional${data.length!==1?'is':''} ativo${data.length!==1?'s':''}:\n\n${linhas}`,
    data: { total: data.length, profissionais: data }
  };
}

// ─── Listar serviços ──────────────────────────────────────────────────────────
async function listServices({ supabase, empresaId }) {
  const { data, error } = await supabase
    .from('agenda_servicos')
    .select('id, nome, preco, duracao_minutos, status')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })
    .limit(50);

  if (error) throw error;
  if (!data?.length) return { answer: 'Nenhum servico cadastrado ainda.' };

  const lista = data.map(s => `${s.nome} (R$ ${Number(s.preco || 0).toFixed(2)}, ${s.duracao_minutos || 60}min)`).join(', ');
  const linhas = data.map(s => `• ${s.nome} — R$ ${Number(s.preco||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}${s.duracao_minutos ? `, ${s.duracao_minutos}min` : ''}`).join('\n');
  return {
    answer: `✦ ${data.length} serviço${data.length!==1?'s':''} ativo${data.length!==1?'s':''}:\n\n${linhas}`,
    data: { total: data.length, servicos: data }
  };
}
