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
    return { type: 'statistics', data: stats };
  }

  // 3. Consultas
  if (matchAny(text, [
    'melhor cliente', 'relatorio', 'faturamento', 'receita', 'lucro',
    'horario livre', 'tem vaga', 'disponivel', 'disponibilidade',
    'cliente inativo', 'pendente', 'agenda de hoje', 'agendamentos de hoje',
    'profissional mais', 'servico mais', 'top cliente', 'top profissional'
  ])) {
    const queryResult = await runQuery(context, text);
    return { type: 'query', data: queryResult };
  }

  // 4. Cancelar agendamento
  if (matchAny(text, ['cancelar', 'recusar', 'excluir agendamento', 'remover agendamento'])) {
    return startSlotFilling('cancel_appointment', message, text, context);
  }

  // 5. Reagendar agendamento
  if (matchAny(text, ['reagendar', 'remarcar', 'trocar horario', 'mudar horario', 'alterar data'])) {
    return startSlotFilling('reschedule_appointment', message, text, context);
  }

  // 6. Criar agendamento
  if (matchAny(text, ['agendar', 'marcar', 'criar agendamento', 'novo agendamento', 'reservar', 'marcar horario'])) {
    return startSlotFilling('create_appointment', message, text, context);
  }

  // 7. Criar cliente
  if (matchAny(text, ['cadastrar cliente', 'novo cliente', 'adicionar cliente', 'criar cliente'])) {
    return startSlotFilling('create_client', message, text, context);
  }

  // 8. Atualizar cliente
  if (matchAny(text, ['atualizar cliente', 'editar cliente', 'alterar cliente'])) {
    return startSlotFilling('update_client', message, text, context);
  }

  // 9. Criar profissional
  if (matchAny(text, ['cadastrar profissional', 'novo profissional', 'criar profissional'])) {
    return startSlotFilling('create_professional', message, text, context);
  }

  // 10. Criar serviço
  if (matchAny(text, ['cadastrar servico', 'novo servico', 'criar servico'])) {
    return startSlotFilling('create_service', message, text, context);
  }

  // 11. Fallback — tenta consulta livre
  const queryResult = await runQuery(context, text);
  return { type: 'query', data: queryResult };
}

// ─── Inicia o slot filling para uma intenção ─────────────────────────────────
async function startSlotFilling(intentName, message, text, context) {
  // Tenta extrair já da primeira mensagem
  const extracted = extractParams(message);

  const slots = buildSlots(intentName);

  // Preenche slots com o que já veio na primeira mensagem
  for (const slot of slots) {
    if (extracted[slot.key] !== undefined) {
      slot.value = extracted[slot.key];
      slot.filled = true;
    }
  }

  // Verifica se já tem tudo — executa direto
  const allFilled = slots.every(s => s.filled);
  if (allFilled) {
    return executeSlot(context, intentName, slots);
  }

  // Pede o próximo slot em falta
  const next = slots.find(s => !s.filled);
  return {
    type: 'slot_filling',
    answer: next.question,
    slotState: { intent: intentName, slots }
  };
}

// ─── Continua preenchendo slots com a resposta do usuário ────────────────────
async function continueSlotFilling(context, message, text, slotState, history) {
  const { intent: intentName, slots } = slotState;

  // Encontra o próximo slot não preenchido
  const next = slots.find(s => !s.filled);
  if (!next) return executeSlot(context, intentName, slots);

  // Preenche com a resposta do usuário
  const value = extractSlotValue(next.key, message);
  if (value) {
    next.value = value;
    next.filled = true;
  } else {
    // Não entendeu — pergunta de novo
    return {
      type: 'slot_filling',
      answer: `Nao entendi. ${next.question}`,
      slotState
    };
  }

  // Verifica se ainda tem slots em falta
  const remaining = slots.find(s => !s.filled);
  if (remaining) {
    return {
      type: 'slot_filling',
      answer: remaining.question,
      slotState: { intent: intentName, slots }
    };
  }

  // Todos preenchidos — executa
  return executeSlot(context, intentName, slots);
}

// ─── Executa a ação com os slots preenchidos ─────────────────────────────────
async function executeSlot(context, intentName, slots) {
  const params = {};
  slots.forEach(s => { if (s.value !== undefined) params[s.key] = s.value; });

  try {
    const result = await executeAction(context, { name: intentName, params });
    return { type: 'action', data: result, slotState: null };
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
      { key: 'cliente_nome', question: 'Qual o nome do cliente?', filled: false },
      { key: 'data', question: 'Qual a data do agendamento? (ex: hoje, amanha, 20/06)', filled: false },
      { key: 'hora', question: 'Qual o horario? (ex: 14h, 14:30)', filled: false },
      { key: 'profissional_nome', question: 'Qual o profissional? (deixe em branco para o primeiro disponivel)', filled: false, optional: true },
      { key: 'servico_nome', question: 'Qual o servico? (deixe em branco para o padrao)', filled: false, optional: true }
    ],
    reschedule_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento?', filled: false },
      { key: 'nova_data', question: 'Qual a nova data?', filled: false },
      { key: 'nova_hora', question: 'Qual o novo horario?', filled: false }
    ],
    cancel_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento a cancelar?', filled: false },
      { key: 'data', question: 'Qual a data do agendamento?', filled: false, optional: true }
    ],
    create_client: [
      { key: 'nome', question: 'Qual o nome do cliente?', filled: false },
      { key: 'telefone', question: 'Qual o telefone? (opcional, pode pular)', filled: false, optional: true },
      { key: 'email', question: 'Qual o email? (opcional, pode pular)', filled: false, optional: true }
    ],
    update_client: [
      { key: 'nome', question: 'Qual o nome do cliente a atualizar?', filled: false },
      { key: 'telefone', question: 'Novo telefone? (opcional)', filled: false, optional: true },
      { key: 'email', question: 'Novo email? (opcional)', filled: false, optional: true }
    ],
    create_professional: [
      { key: 'nome', question: 'Qual o nome do profissional?', filled: false },
      { key: 'especialidade', question: 'Qual a especialidade? (opcional)', filled: false, optional: true },
      { key: 'telefone', question: 'Qual o telefone? (opcional)', filled: false, optional: true }
    ],
    create_service: [
      { key: 'nome', question: 'Qual o nome do servico?', filled: false },
      { key: 'preco', question: 'Qual o preco? (ex: 50.00)', filled: false, optional: true },
      { key: 'duracao_minutos', question: 'Qual a duracao em minutos? (ex: 60)', filled: false, optional: true }
    ]
  };

  return (definitions[intentName] || []).map(s => ({ ...s }));
}

// ─── Extrai o valor certo para cada tipo de slot ─────────────────────────────
function extractSlotValue(key, message) {
  const text = normalizeText(message);

  // Slots de data
  if (key === 'data' || key === 'nova_data') {
    // "pode pular" / "tanto faz" / "qualquer um" — slot opcional ignorado
    if (matchAny(text, ['pular', 'tanto faz', 'qualquer', 'nao sei', 'sem data', 'passa'])) return '__skip__';
    return parseDate(message) || null;
  }

  // Slots de hora
  if (key === 'hora' || key === 'nova_hora') {
    if (matchAny(text, ['pular', 'tanto faz', 'qualquer', 'nao sei'])) return '__skip__';
    return parseTime(message) || null;
  }

  // Slots opcionais — aceita "pular"
  if (matchAny(text, ['pular', 'nao', 'nao tem', 'sem', 'nenhum', 'nenhuma', 'passa', 'tanto faz'])) {
    return '__skip__';
  }

  // Nome / texto livre — pega a mensagem limpa
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

  // Nome do cliente após palavras-chave
  const clienteMatch = message.match(
    /(?:cliente|para|de|nome)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i
  );
  if (clienteMatch) params.cliente_nome = clienteMatch[1].trim();

  // Nome do profissional
  const profMatch = message.match(
    /(?:profissional|com|pelo profissional)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i
  );
  if (profMatch) params.profissional_nome = profMatch[1].trim();

  // Nome do serviço
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
