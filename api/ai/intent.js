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

  // 3. Métricas diretas — "quantos X tenho", "listar X", "agendamentos hoje/amanhã"
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

  // 10. Criar profissional
  if (matchAny(text, ['cadastrar profissional', 'novo profissional', 'criar profissional'])) {
    return startSlotFilling('create_professional', message, text, context);
  }

  // 11. Criar serviço
  if (matchAny(text, ['cadastrar servico', 'novo servico', 'criar servico'])) {
    return startSlotFilling('create_service', message, text, context);
  }

  // 12. Fallback — tenta consulta livre
  const queryResult = await runQuery(context, text);
  return { type: 'query', answer: queryResult.answer, data: queryResult.data };
}

// ─── Detecta métricas diretas ─────────────────────────────────────────────────
// Cobre: "quantos clientes", "listar profissionais", "agendamentos hoje", etc.
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
      { key: 'cliente_nome',      question: 'Qual o nome do cliente?',                                              filled: false },
      { key: 'data',              question: 'Qual a data do agendamento? (ex: hoje, amanha, 20/06)',                filled: false },
      { key: 'hora',              question: 'Qual o horario? (ex: 14h, 14:30)',                                     filled: false },
      { key: 'profissional_nome', question: 'Qual o profissional? (deixe em branco para o primeiro disponivel)',   filled: false, optional: true },
      { key: 'servico_nome',      question: 'Qual o servico? (deixe em branco para o padrao)',                     filled: false, optional: true }
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
      { key: 'nome',     question: 'Qual o nome do cliente?',                    filled: false },
      { key: 'telefone', question: 'Qual o telefone? (opcional, pode pular)',    filled: false, optional: true },
      { key: 'email',    question: 'Qual o email? (opcional, pode pular)',       filled: false, optional: true }
    ],
    update_client: [
      { key: 'nome',     question: 'Qual o nome do cliente a atualizar?', filled: false },
      { key: 'telefone', question: 'Novo telefone? (opcional)',           filled: false, optional: true },
      { key: 'email',    question: 'Novo email? (opcional)',              filled: false, optional: true }
    ],
    create_professional: [
      { key: 'nome',         question: 'Qual o nome do profissional?',       filled: false },
      { key: 'especialidade',question: 'Qual a especialidade? (opcional)',   filled: false, optional: true },
      { key: 'telefone',     question: 'Qual o telefone? (opcional)',        filled: false, optional: true }
    ],
    create_service: [
      { key: 'nome',            question: 'Qual o nome do servico?',                   filled: false },
      { key: 'preco',           question: 'Qual o preco? (ex: 50.00)',                 filled: false, optional: true },
      { key: 'duracao_minutos', question: 'Qual a duracao em minutos? (ex: 60)',       filled: false, optional: true }
    ]
  };

  return (definitions[intentName] || []).map(s => ({ ...s }));
}

// ─── Extrai o valor certo para cada tipo de slot ─────────────────────────────
function extractSlotValue(key, message) {
  const text = normalizeText(message);

  if (key === 'data' || key === 'nova_data') {
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
