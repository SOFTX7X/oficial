import { minutesFromTime, normalizeText, normStatus, parseDate, parseTime } from './utils.js';

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
  const { data, error } = await supabase.from('agenda_profissionais').insert({ empresa_id: empresaId, nome, especialidade: params.especialidade || '', telefone: params.telefone || '', ativo: true }).select('*').single();
  if (error) throw error;
  return { answer: `Profissional ${data.nome} criado com sucesso.`, data };
}

async function updateProfessional({ supabase, empresaId }, params) {
  const current = params.id ? { id: params.id } : await findByName(supabase, 'agenda_profissionais', empresaId, params.nome);
  if (!current?.id) badRequest('Profissional nao encontrado para atualizar.');
  const updates = {};
  ['nome', 'especialidade', 'telefone', 'ativo'].forEach(key => { if (params[key] !== undefined && params[key] !== '') updates[key] = params[key]; });
  const { data, error } = await supabase.from('agenda_profissionais').update(updates).eq('empresa_id', empresaId).eq('id', current.id).select('*').single();
  if (error) throw error;
  return { answer: `Profissional ${data.nome} atualizado.`, data };
}

async function createService({ supabase, empresaId }, params) {
  const nome = String(params.nome || '').trim();
  if (!nome) badRequest('Informe o nome do servico.');
  const { data, error } = await supabase.from('agenda_servicos').insert({ empresa_id: empresaId, nome, preco: Number(params.preco || 0), duracao: Number(params.duracao_minutos || 60), ativo: true }).select('*').single();
  if (error) throw error;
  return { answer: `Servico ${data.nome} criado com sucesso.`, data };
}

async function updateService({ supabase, empresaId }, params) {
  const current = params.id ? { id: params.id } : await findByName(supabase, 'agenda_servicos', empresaId, params.nome);
  if (!current?.id) badRequest('Servico nao encontrado para atualizar.');
  const updates = {};
  if (params.nome !== undefined && params.nome !== '') updates.nome = params.nome;
  if (params.preco !== undefined && params.preco !== '') updates.preco = Number(params.preco);
  if (params.duracao_minutos !== undefined && params.duracao_minutos !== '') updates.duracao = Number(params.duracao_minutos);
  if (params.status !== undefined && params.status !== '') updates.ativo = params.status === 'ativo' || params.status === true;
  
  const { data, error } = await supabase.from('agenda_servicos').update(updates).eq('empresa_id', empresaId).eq('id', current.id).select('*').single();
  if (error) throw error;
  return { answer: `Servico ${data.nome} atualizado.`, data };
}

async function createAppointment({ supabase, empresa, empresaId }, params) {
  const clienteNome = String(params.cliente_nome || params.nome || '').trim();
  const dataAg = params.data || parseDate(params.text);
  const hora = params.hora || parseTime(params.text);
  if (!clienteNome || !dataAg || !hora) badRequest('Informe cliente, data e horario do agendamento.');

  let cliente = await findByName(supabase, 'agenda_clientes', empresaId, clienteNome);
  if (!cliente) cliente = (await createClient({ supabase, empresaId }, { nome: clienteNome, telefone: params.telefone })).data;

  let servico = null;
  if (params.servico_id) {
    const { data: svc } = await supabase.from('agenda_servicos').select('*').eq('id', params.servico_id).single();
    servico = svc;
  } else if (params.servico_nome) {
    servico = await findByName(supabase, 'agenda_servicos', empresaId, params.servico_nome);
  }
  if (!servico) {
    servico = (await supabase.from('agenda_servicos').select('*').eq('empresa_id', empresaId).eq('ativo', true).limit(1)).data?.[0];
  }

  let profissional = null;
  if (params.profissional_id) {
    const { data: prof } = await supabase.from('agenda_profissionais').select('*').eq('id', params.profissional_id).single();
    profissional = prof;
  } else if (params.profissional_nome) {
    profissional = await findByName(supabase, 'agenda_profissionais', empresaId, params.profissional_nome);
  }
  if (!profissional) {
    profissional = (await supabase.from('agenda_profissionais').select('*').eq('empresa_id', empresaId).eq('ativo', true).limit(1)).data?.[0];
  }

  if (!profissional?.id) badRequest('Nenhum profissional ativo encontrado para criar o agendamento.');

  validateAppointmentTime(empresa, dataAg, hora);
  await ensureAppointmentSlotIsFree(supabase, empresaId, profissional.id, dataAg, hora);

  const { data, error } = await supabase.from('agenda_agendamentos').insert({
    empresa_id: empresaId,
    cliente_id: cliente.id,
    servico_id: servico?.id || null,
    profissional_id: profissional?.id || null,
    cliente_nome: cliente.nome,
    cliente_telefone: params.telefone || cliente.telefone || '',
    servico_nome: servico?.nome || '',
    profissional_nome: profesional?.nome || '',
    data: dataAg,
    hora,
    status: params.status || 'Pendente',
    valor: Number(servico?.preco || params.valor || 0)
  }).select('*').single();
  if (error) throw error;
  return { answer: `Agendamento criado para ${data.cliente_nome} em ${data.data} as ${data.hora}.`, data };
}

function validateAppointmentTime(empresa, dataAg, hora) {
  const weekday = new Date(`${dataAg}T00:00:00`).getDay();
  const dayFields = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  if (empresa?.[dayFields[weekday]] === false) {
    badRequest('A empresa esta fechada nesta data.');
  }

  const appointmentMinutes = minutesFromTime(hora);
  const openingMinutes = minutesFromTime(empresa?.horario_abertura || '08:00');
  const closingMinutes = minutesFromTime(empresa?.horario_fechamento || '18:00');
  if (appointmentMinutes < openingMinutes || appointmentMinutes >= closingMinutes) {
    badRequest('Horario fora do funcionamento da empresa.');
  }

  if (empresa?.intervalo_ativo) {
    const pauseStart = minutesFromTime(empresa.intervalo_inicio || '12:00');
    const pauseEnd = minutesFromTime(empresa.intervalo_fim || '13:00');
    if (appointmentMinutes >= pauseStart && appointmentMinutes < pauseEnd) {
      badRequest('Horario indisponivel durante o intervalo da empresa.');
    }
  }
}

async function ensureAppointmentSlotIsFree(supabase, empresaId, profesionalId, dataAg, hora) {
  const { data, error } = await supabase
    .from('agenda_agendamentos')
    .select('id,cliente_nome,status')
    .eq('empresa_id', empresaId)
    .eq('profissional_id', profesionalId)
    .eq('data', dataAg)
    .eq('hora', hora)
    .limit(10);
  if (error) throw error;

  const busy = (data || []).find(appointment => !['Recusado', 'Excluido', 'Excluído', 'excluido'].includes(appointment.status));
  if (busy) {
    badRequest('Horario indisponivel: este profissional ja possui agendamento nesta data e horario.');
  }
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
