import { normalizeText, normStatus, parseDate, parseTime } from './utils.js';

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.publicMessage = message;
  throw error;
}

async function findByName(supabase, table, empresaId, name) {
  if (!name) return null;
  const normalized = normalizeText(name);
  const { data, error } = await supabase.from(table).select('*').eq('empresa_id', empresaId).limit(100);
  if (error) throw error;
  return (data || []).find(row => normalizeText(row.nome) === normalized)
    || (data || []).find(row => normalizeText(row.nome).includes(normalized) || normalized.includes(normalizeText(row.nome)))
    || null;
}

export async function executeAction(context, intent) {
  const handlers = {
    create_client: createClient,
    update_client: updateClient,
    create_professional: createProfessional,
    update_professional: updateProfessional,
    create_service: createService,
    update_service: updateService,
    create_appointment: createAppointment,
    reschedule_appointment: rescheduleAppointment,
    cancel_appointment: cancelAppointment
  };
  const handler = handlers[intent.name];
  if (!handler) badRequest('Acao nao reconhecida.');
  return handler(context, intent.params || {});
}

async function createClient({ supabase, empresaId }, params) {
  const nome = String(params.nome || '').trim();
  if (!nome) badRequest('Informe o nome do cliente.');
  const { data, error } = await supabase.from('agenda_clientes').insert({ empresa_id: empresaId, nome, telefone: params.telefone || '', email: params.email || '', status: 'ativo' }).select('*').single();
  if (error) throw error;
  return { answer: `Cliente ${data.nome} criado com sucesso.`, data };
}

async function updateClient({ supabase, empresaId }, params) {
  const current = params.id ? { id: params.id } : await findByName(supabase, 'agenda_clientes', empresaId, params.nome || params.cliente_nome);
  if (!current?.id) badRequest('Cliente nao encontrado para atualizar.');
  const updates = {};
  ['nome', 'telefone', 'email', 'status'].forEach(key => { if (params[key] !== undefined && params[key] !== '') updates[key] = params[key]; });
  const { data, error } = await supabase.from('agenda_clientes').update(updates).eq('empresa_id', empresaId).eq('id', current.id).select('*').single();
  if (error) throw error;
  return { answer: `Cliente ${data.nome} atualizado.`, data };
}

async function createProfessional({ supabase, empresaId }, params) {
  const nome = String(params.nome || '').trim();
  if (!nome) badRequest('Informe o nome do profissional.');
  const { data, error } = await supabase.from('agenda_profissionais').insert({ empresa_id: empresaId, nome, especialidade: params.especialidade || '', telefone: params.telefone || '', status: 'ativo' }).select('*').single();
  if (error) throw error;
  return { answer: `Profissional ${data.nome} criado com sucesso.`, data };
}

async function updateProfessional({ supabase, empresaId }, params) {
  const current = params.id ? { id: params.id } : await findByName(supabase, 'agenda_profissionais', empresaId, params.nome);
  if (!current?.id) badRequest('Profissional nao encontrado para atualizar.');
  const updates = {};
  ['nome', 'especialidade', 'telefone', 'status'].forEach(key => { if (params[key] !== undefined && params[key] !== '') updates[key] = params[key]; });
  const { data, error } = await supabase.from('agenda_profissionais').update(updates).eq('empresa_id', empresaId).eq('id', current.id).select('*').single();
  if (error) throw error;
  return { answer: `Profissional ${data.nome} atualizado.`, data };
}

async function createService({ supabase, empresaId }, params) {
  const nome = String(params.nome || '').trim();
  if (!nome) badRequest('Informe o nome do servico.');
  const { data, error } = await supabase.from('agenda_servicos').insert({ empresa_id: empresaId, nome, preco: Number(params.preco || 0), duracao_minutos: Number(params.duracao_minutos || 60), status: 'ativo' }).select('*').single();
  if (error) throw error;
  return { answer: `Servico ${data.nome} criado com sucesso.`, data };
}

async function updateService({ supabase, empresaId }, params) {
  const current = params.id ? { id: params.id } : await findByName(supabase, 'agenda_servicos', empresaId, params.nome);
  if (!current?.id) badRequest('Servico nao encontrado para atualizar.');
  const updates = {};
  ['nome', 'preco', 'duracao_minutos', 'status'].forEach(key => {
    if (params[key] !== undefined && params[key] !== '') updates[key] = key === 'preco' || key === 'duracao_minutos' ? Number(params[key]) : params[key];
  });
  const { data, error } = await supabase.from('agenda_servicos').update(updates).eq('empresa_id', empresaId).eq('id', current.id).select('*').single();
  if (error) throw error;
  return { answer: `Servico ${data.nome} atualizado.`, data };
}

async function createAppointment({ supabase, empresaId }, params) {
  const clienteNome = String(params.cliente_nome || params.nome || '').trim();
  const dataAg = params.data || parseDate(params.text);
  const hora = params.hora || parseTime(params.text);
  if (!clienteNome || !dataAg || !hora) badRequest('Informe cliente, data e horario do agendamento.');

  let cliente = await findByName(supabase, 'agenda_clientes', empresaId, clienteNome);
  if (!cliente) cliente = (await createClient({ supabase, empresaId }, { nome: clienteNome, telefone: params.telefone })).data;

  const servico = params.servico_id ? { id: params.servico_id } : (await findByName(supabase, 'agenda_servicos', empresaId, params.servico_nome) || (await supabase.from('agenda_servicos').select('*').eq('empresa_id', empresaId).eq('status', 'ativo').limit(1)).data?.[0]);
  const profissional = params.profissional_id ? { id: params.profissional_id } : (await findByName(supabase, 'agenda_profissionais', empresaId, params.profissional_nome) || (await supabase.from('agenda_profissionais').select('*').eq('empresa_id', empresaId).eq('status', 'ativo').limit(1)).data?.[0]);

  const { data, error } = await supabase.from('agenda_agendamentos').insert({
    empresa_id: empresaId,
    cliente_id: cliente.id,
    servico_id: servico?.id || null,
    profissional_id: profissional?.id || null,
    cliente_nome: cliente.nome,
    cliente_telefone: params.telefone || cliente.telefone || '',
    servico_nome: servico?.nome || '',
    profissional_nome: profissional?.nome || '',
    data: dataAg,
    hora,
    status: params.status || 'Pendente',
    valor: Number(servico?.preco || params.valor || 0)
  }).select('*').single();
  if (error) throw error;
  return { answer: `Agendamento criado para ${data.cliente_nome} em ${data.data} as ${data.hora}.`, data };
}

async function findAppointment({ supabase, empresaId }, params) {
  let query = supabase.from('agenda_agendamentos').select('*').eq('empresa_id', empresaId);
  if (params.id) query = query.eq('id', params.id);
  if (params.data) query = query.eq('data', params.data);
  if (params.hora) query = query.eq('hora', params.hora);
  const { data, error } = await query.order('data', { ascending: false }).limit(50);
  if (error) throw error;
  const name = normalizeText(params.cliente_nome || params.nome || '');
  return (data || []).find(item => !name || normalizeText(item.cliente_nome).includes(name)) || null;
}

async function rescheduleAppointment(context, params) {
  const agendamento = await findAppointment(context, params);
  if (!agendamento?.id) badRequest('Agendamento nao encontrado para reagendar.');
  const updates = { status: 'Reagendado' };
  if (params.nova_data || params.data) updates.data = params.nova_data || params.data;
  if (params.nova_hora || params.hora) updates.hora = params.nova_hora || params.hora;
  const { data, error } = await context.supabase.from('agenda_agendamentos').update(updates).eq('empresa_id', context.empresaId).eq('id', agendamento.id).select('*').single();
  if (error) throw error;
  return { answer: `Agendamento de ${data.cliente_nome} reagendado para ${data.data} as ${data.hora}.`, data };
}

async function cancelAppointment(context, params) {
  const agendamento = await findAppointment(context, params);
  if (!agendamento?.id) badRequest('Agendamento nao encontrado para cancelar.');
  const { data, error } = await context.supabase.from('agenda_agendamentos').update({ status: normStatus(params.status || 'Recusado'), observacoes: params.motivo || agendamento.observacoes || '' }).eq('empresa_id', context.empresaId).eq('id', agendamento.id).select('*').single();
  if (error) throw error;
  return { answer: `Agendamento de ${data.cliente_nome} cancelado.`, data };
}
