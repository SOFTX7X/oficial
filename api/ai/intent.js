import { executeAction } from './actions.js';
import { runQuery } from './queries.js';
import { getStatistics } from './statistics.js';
import { normalizeText, parseDate, parseTime } from './utils.js';

// ─── Entry point principal ───────────────────────────────────────────────────
export async function interpretIntent(context, message, fullBody) {
  const text = normalizeText(message);
  const history = fullBody?.history || [];
  const slotState = fullBody?.slotState || null;

  // 1. Se há um slot filling em andamento, continua coletando
  if (slotState?.intent) {
    return continueSlotFilling(context, message, text, slotState, history);
  }

  // 2. Painel / Estatísticas
  if (matchAny(text, ['painel', 'resumo', 'estatistica', 'dashboard', 'visao geral'])) {
    const stats = await getStatistics(context);
    return { type: 'statistics', answer: stats.answer, data: stats.data };
  }

  // 3. Métricas diretas
  const metricIntent = detectMetricIntent(text);
  if (metricIntent) {
    const stats = await getStatistics(context, { params: { metric: metricIntent } });
    return { type: 'statistics', answer: stats.answer, data: stats.data };
  }

  // 4. Consultas analíticas
  if (matchAny(text, [
    'melhor cliente', 'relatorio', 'faturamento', 'receita', 'lucro',
    'horario livre', 'tem vaga', 'disponivel', 'disponibilidade',
    'cliente inativo', 'pendente', 'agenda de hoje', 'agendamentos de hoje',
    'profissional mais', 'servico mais', 'top cliente', 'top profissional',
    'agendamento de amanha', 'agenda de amanha', 'amanha tem'
  ])) {
    const queryResult = await runQuery(context, text);
    return { type: 'query', answer: queryResult.answer, data: queryResult.data };
  }

  // 5. Cancelar agendamento
  if (matchAny(text, ['cancelar', 'recusar', 'excluir agendamento', 'remover agendamento'])) {
    return startSlotFilling('cancel_appointment', message, text, context);
  }

  // 6. Reagendar agendamento
  if (matchAny(text, ['reagendar', 'remarcar', 'trocar horario', 'mudar horario', 'alterar data'])) {
    return startSlotFilling('reschedule_appointment', message, text, context);
  }

  // 7. Criar agendamento
  if (matchAny(text, ['agendar', 'marcar', 'criar agendamento', 'novo agendamento', 'reservar', 'marcar horario'])) {
    return startSlotFilling('create_appointment', message, text, context);
  }

  // 8. Criar cliente
  if (matchAny(text, ['cadastrar cliente', 'novo cliente', 'adicionar cliente', 'criar cliente'])) {
    return startSlotFilling('create_client', message, text, context);
  }

  // 9. Atualizar cliente
  if (matchAny(text, ['atualizar cliente', 'editar cliente', 'alterar cliente'])) {
    return startSlotFilling('update_client', message, text, context);
  }

  // 10. Desativar cliente
  if (matchAny(text, ['desativar cliente', 'inativar cliente', 'desabilitar cliente'])) {
    return startSlotFilling('deactivate_client', message, text, context);
  }

  // 11. Excluir cliente
  if (matchAny(text, ['excluir cliente', 'deletar cliente', 'apagar cliente', 'remover cliente'])) {
    return startSlotFilling('delete_client', message, text, context);
  }

  // 12. Criar profissional
  if (matchAny(text, ['cadastrar profissional', 'novo profissional', 'criar profissional'])) {
    return startSlotFilling('create_professional', message, text, context);
  }

  // 13. Editar profissional
  if (matchAny(text, ['editar profissional', 'atualizar profissional', 'alterar profissional'])) {
    return startSlotFilling('update_professional', message, text, context);
  }

  // 14. Desativar profissional
  if (matchAny(text, ['desativar profissional', 'inativar profissional', 'desabilitar profissional'])) {
    return startSlotFilling('deactivate_professional', message, text, context);
  }

  // 15. Excluir profissional
  if (matchAny(text, ['excluir profissional', 'deletar profissional', 'apagar profissional', 'remover profissional'])) {
    return startSlotFilling('delete_professional', message, text, context);
  }

  // 16. Criar serviço
  if (matchAny(text, ['cadastrar servico', 'novo servico', 'criar servico'])) {
    return startSlotFilling('create_service', message, text, context);
  }

  // 17. Editar serviço
  if (matchAny(text, ['editar servico', 'atualizar servico', 'alterar servico'])) {
    return startSlotFilling('update_service', message, text, context);
  }

  // 18. Desativar serviço
  if (matchAny(text, ['desativar servico', 'inativar servico', 'desabilitar servico'])) {
    return startSlotFilling('deactivate_service', message, text, context);
  }

  // 19. Excluir serviço
  if (matchAny(text, ['excluir servico', 'deletar servico', 'apagar servico', 'remover servico'])) {
    return startSlotFilling('delete_service', message, text, context);
  }

  // 20. Listar agendamentos completos
  if (matchAny(text, ['listar agendamentos', 'todos agendamentos', 'ver agendamentos', 'mostrar agendamentos', 'lista de agendamentos'])) {
    const queryResult = await runQuery(context, { name: 'list_appointments', params: {} });
    return { type: 'query', answer: queryResult.answer, data: queryResult.data };
  }

  // 21. Clientes por período
  if (matchAny(text, ['clientes por periodo', 'clientes no periodo', 'novos clientes', 'clientes entre'])) {
    return startSlotFilling('clients_by_period', message, text, context);
  }

  // 22. Faturamento por período
  if (matchAny(text, ['faturamento por periodo', 'faturamento entre', 'receita por periodo', 'receita entre', 'quanto faturei entre', 'ganho por periodo'])) {
    return startSlotFilling('revenue_by_period', message, text, context);
  }

  // 23. Fallback — tenta consulta livre
  const queryResult = await runQuery(context, text);
  return { type: 'query', answer: queryResult.answer, data: queryResult.data };
}

// ─── Detecta métricas diretas ─────────────────────────────────────────────────
function detectMetricIntent(text) {
  if (matchAny(text, [
    'quantos clientes', 'total de clientes', 'listar clientes',
    'numero de clientes', 'meus clientes'
  ])) return 'clientes';

  if (matchAny(text, [
    'quantos profissionais', 'total de profissionais', 'listar profissionais',
    'numero de profissionais', 'meus profissionais'
  ])) return 'profissionais';

  if (matchAny(text, [
    'quantos servicos', 'total de servicos', 'listar servicos',
    'numero de servicos', 'meus servicos'
  ])) return 'servicos';

  if (matchAny(text, [
    'agendamentos hoje', 'agenda hoje', 'hoje quantos', 'quantos hoje',
    'compromissos hoje', 'horarios hoje'
  ])) return 'agendamentos_hoje';

  if (matchAny(text, [
    'agendamentos amanha', 'agenda amanha', 'amanha quantos', 'quantos amanha',
    'compromissos amanha', 'horarios amanha'
  ])) return 'agendamentos_amanha';

  if (matchAny(text, [
    'quantos agendamentos', 'total de agendamentos', 'numero de agendamentos'
  ])) return 'agendamentos';

  if (matchAny(text, [
    'quantos pendentes', 'total pendentes', 'agendamentos pendentes'
  ])) return 'pendentes';

  if (matchAny(text, [
    'quantos confirmados', 'total confirmados', 'agendamentos confirmados'
  ])) return 'confirmados';

  return null;
}

// ─── Inicia o slot filling para uma intenção ─────────────────────────────────
async function startSlotFilling(intentName, message, text, context) {
  const extracted = extractParams(message);
  const slots = buildSlots(intentName);

  for (const slot of slots) {
    if (extracted[slot.key] !== undefined) {
      slot.value = extracted[slot.key];
      slot.filled = true;
    }
  }

  const allFilled = slots.every(s => s.filled || s.optional);
  if (allFilled) {
    return executeSlot(context, intentName, slots);
  }

  const next = slots.find(s => !s.filled && !s.optional);
  return {
    type: 'slot_filling',
    answer: next.question,
    slotState: { intent: intentName, slots }
  };
}

// ─── Continua preenchendo slots com a resposta do usuário ────────────────────
async function continueSlotFilling(context, message, text, slotState, history) {
  const { intent: intentName, slots } = slotState;

  const next = slots.find(s => !s.filled);
  if (!next) return executeSlot(context, intentName, slots);

  const value = extractSlotValue(next.key, message);
  if (value) {
    next.value = value === '__skip__' ? undefined : value;
    next.filled = true;
  } else {
    return {
      type: 'slot_filling',
      answer: `Nao entendi. ${next.question}`,
      slotState
    };
  }

  const remaining = slots.find(s => !s.filled && !s.optional);
  if (remaining) {
    return {
      type: 'slot_filling',
      answer: remaining.question,
      slotState: { intent: intentName, slots }
    };
  }

  return executeSlot(context, intentName, slots);
}

// ─── Executa a ação com os slots preenchidos ─────────────────────────────────
async function executeSlot(context, intentName, slots) {
  const params = {};
  slots.forEach(s => { if (s.value !== undefined) params[s.key] = s.value; });

  // Intents de query (não são actions)
  if (intentName === 'clients_by_period' || intentName === 'revenue_by_period') {
    try {
      const result = await runQuery(context, { name: intentName, params });
      return { type: 'query', answer: result.answer, data: result.data, slotState: null };
    } catch (err) {
      return {
        type: 'error',
        answer: err.publicMessage || err.message || 'Erro ao executar consulta.',
        slotState: null
      };
    }
  }

  try {
    const result = await executeAction(context, { name: intentName, params });
    return { type: 'action', answer: result.answer, data: result.data, slotState: null };
  } catch (err) {
    return {
      type: 'error',
      answer: err.publicMessage || err.message || 'Erro ao executar acao.',
      slotState: null
    };
  }
}

// ─── Define os slots necessários para cada intenção ──────────────────────────
function buildSlots(intentName) {
  const definitions = {
    create_appointment: [
      { key: 'cliente_nome',      question: 'Qual o nome do cliente?',                                            filled: false },
      { key: 'data',              question: 'Qual a data do agendamento? (ex: hoje, amanha, 20/06)',              filled: false },
      { key: 'hora',              question: 'Qual o horario? (ex: 14h, 14:30)',                                   filled: false },
      { key: 'profissional_nome', question: 'Qual o profissional? (deixe em branco para o primeiro disponivel)', filled: false, optional: true },
      { key: 'servico_nome',      question: 'Qual o servico? (deixe em branco para o padrao)',                   filled: false, optional: true }
    ],
    reschedule_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento?', filled: false },
      { key: 'nova_data',    question: 'Qual a nova data?',                      filled: false },
      { key: 'nova_hora',    question: 'Qual o novo horario?',                   filled: false }
    ],
    cancel_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento a cancelar?', filled: false },
      { key: 'data',         question: 'Qual a data do agendamento?',                       filled: false, optional: true }
    ],
    create_client: [
      { key: 'nome',     question: 'Qual o nome do cliente?',                 filled: false },
      { key: 'telefone', question: 'Qual o telefone? (opcional, pode pular)', filled: false, optional: true },
      { key: 'email',    question: 'Qual o email? (opcional, pode pular)',    filled: false, optional: true }
    ],
    update_client: [
      { key: 'nome',     question: 'Qual o nome do cliente a editar?', filled: false },
      { key: 'telefone', question: 'Novo telefone? (opcional)',        filled: false, optional: true },
      { key: 'email',    question: 'Novo email? (opcional)',           filled: false, optional: true }
    ],
    deactivate_client: [
      { key: 'nome', question: 'Qual o nome do cliente a desativar?', filled: false }
    ],
    delete_client: [
      { key: 'nome', question: 'Qual o nome do cliente a excluir?', filled: false }
    ],
    create_professional: [
      { key: 'nome',          question: 'Qual o nome do profissional?',     filled: false },
      { key: 'especialidade', question: 'Qual a especialidade? (opcional)', filled: false, optional: true },
      { key: 'telefone',      question: 'Qual o telefone? (opcional)',      filled: false, optional: true }
    ],
    update_professional: [
      { key: 'nome',          question: 'Qual o nome do profissional a editar?', filled: false },
      { key: 'especialidade', question: 'Nova especialidade? (opcional)',         filled: false, optional: true },
      { key: 'telefone',      question: 'Novo telefone? (opcional)',              filled: false, optional: true }
    ],
    deactivate_professional: [
      { key: 'nome', question: 'Qual o nome do profissional a desativar?', filled: false }
    ],
    delete_professional: [
      { key: 'nome', question: 'Qual o nome do profissional a excluir?', filled: false }
    ],
    create_service: [
      { key: 'nome',            question: 'Qual o nome do servico?',             filled: false },
      { key: 'preco',           question: 'Qual o preco? (ex: 50.00)',           filled: false, optional: true },
      { key: 'duracao_minutos', question: 'Qual a duracao em minutos? (ex: 60)', filled: false, optional: true }
    ],
    update_service: [
      { key: 'nome',            question: 'Qual o nome do servico a editar?',    filled: false },
      { key: 'novo_nome',       question: 'Novo nome? (opcional)',               filled: false, optional: true },
      { key: 'preco',           question: 'Novo preco? (opcional)',              filled: false, optional: true },
      { key: 'duracao_minutos', question: 'Nova duracao em minutos? (opcional)', filled: false, optional: true }
    ],
    deactivate_service: [
      { key: 'nome', question: 'Qual o nome do servico a desativar?', filled: false }
    ],
    delete_service: [
      { key: 'nome', question: 'Qual o nome do servico a excluir?', filled: false }
    ],
    clients_by_period: [
      { key: 'data_inicio', question: 'Qual a data de inicio do periodo? (ex: 01/06)', filled: false },
      { key: 'data_fim',    question: 'Qual a data de fim do periodo? (ex: 30/06)',    filled: false }
    ],
    revenue_by_period: [
      { key: 'data_inicio', question: 'Qual a data de inicio do periodo? (ex: 01/06)', filled: false },
      { key: 'data_fim',    question: 'Qual a data de fim do periodo? (ex: 30/06)',    filled: false }
    ]
  };

  return (definitions[intentName] || []).map(s => ({ ...s }));
}

// ─── Extrai o valor certo para cada tipo de slot ─────────────────────────────
function extractSlotValue(key, message) {
  const text = normalizeText(message);

  if (key === 'data' || key === 'nova_data' || key === 'data_inicio' || key === 'data_fim') {
    if (matchAny(text, ['pular', 'tanto faz', 'qualquer', 'nao sei', 'sem data', 'passa'])) return '__skip__';
    return parseDate(message) || null;
  }

  if (key === 'hora' || key === 'nova_hora') {
    if (matchAny(text, ['pular', 'tanto faz', 'qualquer', 'nao sei'])) return '__skip__';
    return parseTime(message) || null;
  }

  if (matchAny(text, ['pular', 'nao', 'nao tem', 'sem', 'nenhum', 'nenhuma', 'passa', 'tanto faz'])) {
    return '__skip__';
  }

  const cleaned = message.trim();
  return cleaned.length >= 2 ? cleaned : null;
}

// ─── Extrai múltiplos parâmetros de uma mensagem livre ───────────────────────
function extractParams(message) {
  const params = {};

  const data = parseDate(message);
  if (data) params.data = data;

  const hora = parseTime(message);
  if (hora) params.hora = hora;

  const clienteMatch = message.match(
    /(?:cliente|para|de|nome)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i
  );
  if (clienteMatch) params.cliente_nome = clienteMatch[1].trim();

  const profMatch = message.match(
    /(?:profissional|com|pelo profissional)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i
  );
  if (profMatch) params.profissional_nome = profMatch[1].trim();

  const servicoMatch = message.match(
    /(?:servico|serviço|para o servico|para o serviço)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i
  );
  if (servicoMatch) params.servico_nome = servicoMatch[1].trim();

  return params;
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function matchAny(text, terms) {
  return terms.some(term => text.includes(normalizeText(term)));
}
