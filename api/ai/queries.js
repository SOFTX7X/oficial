import { activeStatus, minutesFromTime, normStatus, timeFromMinutes, todayISO } from './utils.js';

function groupBy(rows, keyFn) {
  const map = new Map();
  rows.forEach(row => {
    const key = keyFn(row);
    if (!key) return;
    const current = map.get(key) || { key, count: 0, valor: 0, sample: row };
    current.count += 1;
    current.valor += Number(row.valor || 0);
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => b.count - a.count || b.valor - a.valor);
}

export async function executeQuery(context, intent) {
  const handlers = { best_client: bestClient, top_professional: topProfessional, top_service: topService, free_slots: freeSlots, inactive_clients: inactiveClients, pending_appointments: pendingAppointments };
  return (handlers[intent.name] || pendingAppointments)(context, intent.params || {});
}

async function bestClient({ supabase, empresaId }) {
  const { data, error } = await supabase.from('agenda_agendamentos').select('cliente_id,cliente_nome,valor,status').eq('empresa_id', empresaId);
  if (error) throw error;
  const [top] = groupBy((data || []).filter(a => normStatus(a.status) !== 'Recusado'), a => a.cliente_id || a.cliente_nome);
  return { answer: top ? `Seu melhor cliente e ${top.sample.cliente_nome}, com ${top.count} agendamento(s).` : 'Ainda nao ha agendamentos suficientes para identificar o melhor cliente.', data: top || null };
}

async function topProfessional({ supabase, empresaId }) {
  const { data, error } = await supabase.from('agenda_agendamentos').select('profissional_id,profissional_nome,valor,status').eq('empresa_id', empresaId);
  if (error) throw error;
  const [top] = groupBy((data || []).filter(a => normStatus(a.status) !== 'Recusado'), a => a.profissional_id || a.profissional_nome);
  return { answer: top ? `O profissional que mais atende e ${top.sample.profissional_nome}, com ${top.count} agendamento(s).` : 'Ainda nao ha agendamentos suficientes para identificar o profissional mais ocupado.', data: top || null };
}

async function topService({ supabase, empresaId }) {
  const { data, error } = await supabase.from('agenda_agendamentos').select('servico_id,servico_nome,valor,status').eq('empresa_id', empresaId);
  if (error) throw error;
  const [top] = groupBy((data || []).filter(a => normStatus(a.status) !== 'Recusado'), a => a.servico_id || a.servico_nome);
  return { answer: top ? `O servico mais vendido e ${top.sample.servico_nome}, com ${top.count} venda(s).` : 'Ainda nao ha agendamentos suficientes para identificar o servico mais vendido.', data: top || null };
}

async function freeSlots({ supabase, empresa, empresaId }, params) {
  const data = params.data || todayISO(0);
  const weekday = new Date(`${data}T00:00:00`).getDay();
  const dayFields = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  if (empresa[dayFields[weekday]] === false) return { answer: 'A empresa esta fechada nesta data.', data: { data, horarios: [] } };

  const [{ data: profissionais, error: profError }, { data: agendamentos, error: agError }] = await Promise.all([
    supabase.from('agenda_profissionais').select('id,nome,status').eq('empresa_id', empresaId).eq('status', 'ativo'),
    supabase.from('agenda_agendamentos').select('profissional_id,hora,status').eq('empresa_id', empresaId).eq('data', data)
  ]);
  if (profError) throw profError;
  if (agError) throw agError;

  const profIds = (profissionais || []).map(p => p.id);
  const abertura = minutesFromTime(empresa.horario_abertura || '08:00');
  const fechamento = minutesFromTime(empresa.horario_fechamento || '18:00');
  const intervalo = Number(empresa.intervalo_agenda_minutos || 30);
  const pausaInicio = minutesFromTime(empresa.intervalo_inicio || '12:00');
  const pausaFim = minutesFromTime(empresa.intervalo_fim || '13:00');
  const ocupados = new Set((agendamentos || []).filter(a => normStatus(a.status) !== 'Recusado').map(a => `${a.profissional_id || 'sem-prof'}:${a.hora}`));

  const horarios = [];
  for (let minute = abertura; minute < fechamento; minute += intervalo) {
    if (empresa.intervalo_ativo && minute >= pausaInicio && minute < pausaFim) continue;
    const hora = timeFromMinutes(minute);
    if (profIds.length === 0 || profIds.some(id => !ocupados.has(`${id}:${hora}`))) horarios.push(hora);
  }
  return { answer: horarios.length ? `Encontrei ${horarios.length} horario(s) livre(s) em ${data}.` : `Nao encontrei horarios livres em ${data}.`, data: { data, horarios } };
}

async function inactiveClients({ supabase, empresaId }) {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const limitDate = since.toISOString().slice(0, 10);
  const [{ data: clientes, error: clientesError }, { data: agendamentos, error: agError }] = await Promise.all([
    activeStatus(supabase.from('agenda_clientes').select('*').eq('empresa_id', empresaId)),
    supabase.from('agenda_agendamentos').select('cliente_id,cliente_nome,data').eq('empresa_id', empresaId).gte('data', limitDate)
  ]);
  if (clientesError) throw clientesError;
  if (agError) throw agError;
  const recentes = new Set((agendamentos || []).map(a => a.cliente_id || a.cliente_nome));
  const inativos = (clientes || []).filter(c => c.status === 'inativo' || !recentes.has(c.id || c.nome));
  return { answer: `Encontrei ${inativos.length} cliente(s) inativo(s).`, data: inativos };
}

async function pendingAppointments({ supabase, empresaId }) {
  const { data, error } = await supabase.from('agenda_agendamentos').select('*').eq('empresa_id', empresaId).eq('status', 'Pendente').order('data', { ascending: true }).order('hora', { ascending: true }).limit(50);
  if (error) throw error;
  return { answer: `Encontrei ${(data || []).length} agendamento(s) pendente(s).`, data: data || [] };
}
