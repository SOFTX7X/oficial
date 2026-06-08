import { executeAction } from './actions.js';
import { runQuery } from './queries.js';
import { getStatistics } from './statistics.js';
import { normalizeText, parseDate, parseTime } from './utils.js';
import { askGroq, polishAnswer, polishQueryAnswer, generateContent } from './groq.js';

// ─── Helpers seguros ──────────────────────────────────────────────────────────
async function safeRunQuery(context, input) {
  try {
    const result = await runQuery(context, input);
    // API já trouxe os dados — Groq só formata a resposta final para o usuário
    if (result?.answer && !result.answer.startsWith('Nao entendi')) {
      result.answer = await polishQueryAnswer(context, result.answer).catch(() => result.answer);
    }
    return result;
  } catch (err) {
    return { answer: err.publicMessage || err.message || 'Erro ao consultar dados. Tente novamente.' };
  }
}

async function safeGetStatistics(context, intent) {
  try {
    const result = await getStatistics(context, intent);
    // API já trouxe os dados — Groq só formata a resposta final para o usuário
    if (result?.answer) {
      result.answer = await polishQueryAnswer(context, result.answer).catch(() => result.answer);
    }
    return result;
  } catch (err) {
    return { answer: err.publicMessage || err.message || 'Erro ao buscar estatisticas. Tente novamente.' };
  }
}

// ─── Entry point principal ────────────────────────────────────────────────────
export async function interpretIntent(context, message, fullBody) {
  const text = normalizeText(message);
  const history = fullBody?.history || [];
  const slotState = fullBody?.slotState || null;

  // 1. Slot filling em andamento
  if (slotState?.intent) {
    return continueSlotFilling(context, message, text, slotState, history);
  }

  // ── SAUDAÇÕES, IDENTIDADE, AGRADECIMENTOS, DESPEDIDAS, AJUDA → TUDO VIA GROQ ──
  if (matchAny(text, [
    'oi', 'ola', 'hello', 'hey', 'bom dia', 'boa tarde', 'boa noite', 'eai', 'e ai',
    'tudo bem', 'tudo bom', 'como vai', 'oi vyxora', 'ola vyxora',
    'quem e voce', 'o que voce e', 'o que e vyxora', 'o que voce faz', 'me fala sobre voce',
    'voce e uma ia', 'voce e um bot', 'voce e humano',
    'obrigado', 'obrigada', 'valeu', 'muito obrigado', 'muito obrigada', 'thanks', 'thank you',
    'grato', 'grata', 'otimo', 'excelente', 'perfeito', 'mandou bem', 'arrasou',
    'tchau', 'ate logo', 'ate mais', 'xau', 'bye', 'falou', 'flw', 'encerrando', 'encerrar',
    'ajuda', 'help', 'socorro', 'o que posso fazer', 'o que voce pode fazer', 'o que voce sabe fazer',
    'quais comandos', 'como funciona', 'como usar', 'me ajuda', 'preciso de ajuda',
    'nao sei usar', 'tutorial', 'como comecar',
    'como agendar', 'como criar agendamento', 'como marcar', 'como marcar horario',
    'como fazer agendamento', 'ajuda agendamento', 'como funciona agendamento',
    'como reagendar', 'como cancelar agendamento', 'como confirmar agendamento', 'como concluir agendamento',
    'como cadastrar cliente', 'como adicionar cliente', 'como criar cliente', 'como editar cliente',
    'como excluir cliente', 'como desativar cliente', 'ajuda cliente', 'como gerenciar clientes', 'como ver clientes',
    'como cadastrar profissional', 'como adicionar profissional', 'como criar profissional',
    'como editar profissional', 'como excluir profissional', 'como desativar profissional',
    'ajuda profissional', 'como gerenciar profissionais',
    'como cadastrar servico', 'como adicionar servico', 'como criar servico', 'como editar servico',
    'como excluir servico', 'como desativar servico', 'ajuda servico', 'como gerenciar servicos', 'como ver servicos',
    'como ver faturamento', 'como ver relatorio', 'como ver receita', 'como consultar faturamento',
    'ajuda relatorio', 'ajuda financeiro', 'como ver financeiro', 'como ver estatisticas', 'como ver painel',
    'como ver horario livre', 'como consultar disponibilidade', 'como saber horarios disponiveis',
    'ajuda horarios', 'como ver vagas',
    'como usar o painel', 'como navegar', 'onde fica', 'onde esta', 'como acesso', 'como entro em',
    'o que e o painel', 'explicar painel', 'me explica o painel',
    'erro', 'nao funciona', 'problema', 'bug', 'nao consigo', 'nao aparece', 'sumiu'
  ])) {
    return await askGroq(context, message, history);
  }

  // ── GERAÇÃO DE CONTEÚDO PROFISSIONAL ─────────────────────────────────────────
  const contentIntent = detectContentIntent(text, message);
  if (contentIntent) {
    try {
      return await generateContent(context, contentIntent);
    } catch (err) {
      return await askGroq(context, message, history);
    }
  }

  // ── PAINEL / ESTATÍSTICAS ─────────────────────────────────────────────────────
  if (matchAny(text, ['painel', 'resumo', 'estatistica', 'dashboard', 'visao geral', 'como esta meu negocio', 'como vai meu negocio', 'situacao atual', 'resumo geral', 'me da um resumo'])) {
    const stats = await safeGetStatistics(context);
    return { type: 'statistics', answer: stats.answer, data: stats.data };
  }

  // ── MÉTRICAS DIRETAS ──────────────────────────────────────────────────────────
  const metricIntent = detectMetricIntent(text);
  if (metricIntent) {
    const stats = await safeGetStatistics(context, { params: { metric: metricIntent } });
    return { type: 'statistics', answer: stats.answer, data: stats.data };
  }

  // ── CONSULTAS ANALÍTICAS ──────────────────────────────────────────────────────
  if (matchAny(text, [
    'melhor cliente', 'relatorio', 'horario livre', 'tem vaga', 'disponivel', 'disponibilidade',
    'cliente inativo', 'pendente', 'agenda de hoje', 'agendamentos de hoje',
    'profissional mais', 'servico mais', 'top cliente', 'top profissional',
    'agendamento de amanha', 'agenda de amanha', 'amanha tem', 'clientes inativos',
    'quem nao agenda', 'clientes sem agendamento', 'fila de espera', 'aguardando aprovacao',
    'servico mais pedido', 'mais agendado', 'servico popular'
  ])) {
    const queryResult = await safeRunQuery(context, text);
    return { type: 'query', answer: queryResult.answer, data: queryResult.data };
  }

  // ── FATURAMENTO GERAL ─────────────────────────────────────────────────────────
  if (matchAny(text, ['faturamento', 'receita', 'lucro', 'quanto ganhei', 'quanto faturei', 'ganhos', 'financeiro']) &&
    !matchAny(text, ['mes', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro', 'periodo', 'em '])) {
    const queryResult = await safeRunQuery(context, text);
    return { type: 'query', answer: queryResult.answer, data: queryResult.data };
  }

  // ── AÇÕES ─────────────────────────────────────────────────────────────────────

  if (matchAny(text, ['cancelar', 'recusar', 'excluir agendamento', 'remover agendamento', 'cancelar consulta', 'cancelar horario'])) {
    return startSlotFilling('cancel_appointment', message, text, context);
  }

  if (matchAny(text, ['confirmar agendamento', 'confirmar agenda', 'aprovar agendamento', 'aceitar agendamento', 'confirmar consulta', 'confirmar horario'])) {
    return startSlotFilling('confirm_appointment', message, text, context);
  }

  if (matchAny(text, ['concluir agendamento', 'finalizar agendamento', 'marcar como concluido', 'concluir atendimento', 'finalizar atendimento', 'atendimento realizado', 'marcar concluido'])) {
    return startSlotFilling('conclude_appointment', message, text, context);
  }

  if (matchAny(text, ['reagendar', 'remarcar', 'trocar horario', 'mudar horario', 'alterar data', 'alterar horario', 'mudar data', 'trocar data', 'mover agendamento'])) {
    return startSlotFilling('reschedule_appointment', message, text, context);
  }

  if (matchAny(text, ['agendar', 'marcar', 'criar agendamento', 'novo agendamento', 'reservar', 'marcar horario', 'fazer agendamento', 'quero agendar', 'preciso agendar', 'bota na agenda', 'coloca na agenda', 'adicionar agendamento'])) {
    return startSlotFilling('create_appointment', message, text, context);
  }

  if (matchAny(text, ['cadastrar cliente', 'novo cliente', 'adicionar cliente', 'criar cliente', 'registrar cliente', 'incluir cliente', 'quero cadastrar cliente'])) {
    return startSlotFilling('create_client', message, text, context);
  }

  if (matchAny(text, ['atualizar cliente', 'editar cliente', 'alterar cliente', 'mudar dados cliente', 'corrigir cliente', 'modificar cliente'])) {
    return startSlotFilling('update_client', message, text, context);
  }

  if (matchAny(text, ['cadastrar profissional', 'novo profissional', 'criar profissional', 'adicionar profissional', 'registrar profissional', 'incluir profissional'])) {
    return startSlotFilling('create_professional', message, text, context);
  }

  if (matchAny(text, ['cadastrar servico', 'novo servico', 'criar servico', 'adicionar servico', 'registrar servico', 'incluir servico'])) {
    return startSlotFilling('create_service', message, text, context);
  }

  if (matchAny(text, ['editar profissional', 'atualizar profissional', 'alterar profissional', 'mudar profissional', 'modificar profissional', 'corrigir profissional'])) {
    return startSlotFilling('update_professional', message, text, context);
  }

  if (matchAny(text, ['editar servico', 'atualizar servico', 'alterar servico', 'mudar servico', 'modificar servico', 'corrigir servico'])) {
    return startSlotFilling('update_service', message, text, context);
  }

  if (matchAny(text, ['desativar cliente', 'inativar cliente', 'suspender cliente', 'bloquear cliente'])) {
    return startSlotFilling('disable_client', message, text, context);
  }

  if (matchAny(text, ['desativar profissional', 'inativar profissional', 'suspender profissional', 'bloquear profissional'])) {
    return startSlotFilling('disable_professional', message, text, context);
  }

  if (matchAny(text, ['desativar servico', 'inativar servico', 'suspender servico', 'bloquear servico'])) {
    return startSlotFilling('disable_service', message, text, context);
  }

  if (matchAny(text, ['excluir cliente', 'deletar cliente', 'remover cliente', 'apagar cliente'])) {
    return startSlotFilling('delete_client', message, text, context);
  }

  if (matchAny(text, ['excluir profissional', 'deletar profissional', 'remover profissional', 'apagar profissional'])) {
    return startSlotFilling('delete_professional', message, text, context);
  }

  if (matchAny(text, ['excluir servico', 'deletar servico', 'remover servico', 'apagar servico'])) {
    return startSlotFilling('delete_service', message, text, context);
  }

  if (matchAny(text, ['reativar cliente', 'ativar cliente', 'reabilitar cliente'])) {
    return startSlotFilling('reactivate_client', message, text, context);
  }

  if (matchAny(text, ['reativar profissional', 'ativar profissional', 'reabilitar profissional'])) {
    return startSlotFilling('reactivate_professional', message, text, context);
  }

  if (matchAny(text, ['reativar servico', 'ativar servico', 'reabilitar servico'])) {
    return startSlotFilling('reactivate_service', message, text, context);
  }

  if (matchAny(text, ['listar agendamentos', 'todos agendamentos', 'ver agendamentos', 'mostrar agendamentos', 'lista de agendamentos', 'meus agendamentos', 'historico de agendamentos'])) {
    const queryResult = await safeRunQuery(context, { name: 'list_appointments', params: {} });
    return { type: 'query', answer: queryResult.answer, data: queryResult.data };
  }

  if (matchAny(text, ['clientes por periodo', 'clientes do mes', 'novos clientes', 'clientes em ', 'clientes de '])) {
    const queryResult = await safeRunQuery(context, { name: 'clients_by_period', params: { text: message } });
    return { type: 'query', answer: queryResult.answer, data: queryResult.data };
  }

  if (matchAny(text, [
    'faturamento do mes', 'faturamento por periodo', 'faturamento em ', 'faturamento de ',
    'receita do mes', 'receita por periodo', 'receita em ', 'receita de ',
    'quanto ganhei em ', 'quanto faturei em ', 'quanto ganhei de ', 'quanto faturei de '
  ]) || (
    matchAny(text, ['faturamento', 'receita', 'quanto ganhei', 'quanto faturei']) &&
    matchAny(text, ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'])
  )) {
    const queryResult = await safeRunQuery(context, { name: 'revenue_by_period', params: { text: message } });
    return { type: 'query', answer: queryResult.answer, data: queryResult.data };
  }

  // ── FALLBACK INTELIGENTE ──────────────────────────────────────────────────────
  const queryResult = await safeRunQuery(context, text);

  if (!queryResult || queryResult.answer?.startsWith('Nao entendi')) {
    // API não reconheceu — Groq entra só para conversar/orientar, SEM inventar dados
    try {
      return await askGroq(context, `[SEM DADOS DO SISTEMA] ${message}`, history);
    } catch (err) {
      return { type: 'chat', answer: fallbackAnswer(message) };
    }
  }

  return { type: 'query', answer: queryResult.answer, data: queryResult.data };
}

// ─── Detecta métricas diretas ─────────────────────────────────────────────────
function detectMetricIntent(text) {
  if (matchAny(text, ['quantos clientes', 'total de clientes', 'listar clientes', 'ver clientes', 'mostrar clientes', 'numero de clientes', 'meus clientes', 'todos os clientes'])) return 'clientes';
  if (matchAny(text, ['quantos profissionais', 'total de profissionais', 'listar profissionais', 'ver profissionais', 'mostrar profissionais', 'numero de profissionais', 'meus profissionais', 'todos os profissionais'])) return 'profissionais';
  if (matchAny(text, ['quantos servicos', 'total de servicos', 'listar servicos', 'ver servicos', 'mostrar servicos', 'numero de servicos', 'meus servicos', 'todos os servicos'])) return 'servicos';
  if (matchAny(text, ['agendamentos hoje', 'agenda hoje', 'hoje quantos', 'quantos hoje', 'compromissos hoje', 'horarios hoje', 'agenda do dia', 'o que tem hoje', 'o que tem pra hoje', 'hoje na agenda'])) return 'agendamentos_hoje';
  if (matchAny(text, ['agendamentos amanha', 'agenda amanha', 'amanha quantos', 'quantos amanha', 'compromissos amanha', 'horarios amanha', 'o que tem amanha', 'agenda de amanha'])) return 'agendamentos_amanha';
  if (matchAny(text, ['quantos agendamentos', 'total de agendamentos', 'numero de agendamentos', 'todos os agendamentos'])) return 'agendamentos';
  if (matchAny(text, ['quantos pendentes', 'total pendentes', 'agendamentos pendentes', 'pendentes de aprovacao', 'o que esta pendente'])) return 'pendentes';
  if (matchAny(text, ['quantos confirmados', 'total confirmados', 'agendamentos confirmados'])) return 'confirmados';
  return null;
}

// ─── Inicia slot filling ──────────────────────────────────────────────────────
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
  if (allFilled) return executeSlot(context, intentName, slots);

  const next = slots.find(s => !s.filled && !s.optional);
  return { type: 'slot_filling', answer: next.question, slotState: { intent: intentName, slots } };
}

// ─── Continua slot filling ────────────────────────────────────────────────────
async function continueSlotFilling(context, message, text, slotState, history) {
  const { intent: intentName, slots } = slotState;

  const next = slots.find(s => !s.filled);
  if (!next) return executeSlot(context, intentName, slots);

  const value = extractSlotValue(next.key, message);
  if (value) {
    next.value = value === '__skip__' ? undefined : value;
    next.filled = true;
  } else {
    return { type: 'slot_filling', answer: `Não entendi. ${next.question}`, slotState };
  }

  const remaining = slots.find(s => !s.filled);
  if (remaining) {
    return { type: 'slot_filling', answer: remaining.question, slotState: { intent: intentName, slots } };
  }

  return executeSlot(context, intentName, slots);
}

// ─── Executa ação ─────────────────────────────────────────────────────────────
async function executeSlot(context, intentName, slots) {
  const params = {};
  slots.forEach(s => { if (s.value !== undefined) params[s.key] = s.value; });

  try {
    const result = await executeAction(context, { name: intentName, params });
    // Formata a resposta bruta com o Groq (falha silenciosamente)
    const polished = await polishAnswer(context, result.answer, intentName);
    return { type: 'action', answer: polished, data: result.data, slotState: null };
  } catch (err) {
    return { type: 'error', answer: err.publicMessage || err.message || 'Erro ao executar acao.', slotState: null };
  }
}

// ─── Slots por intenção ───────────────────────────────────────────────────────
function buildSlots(intentName) {
  const definitions = {
    create_appointment: [
      { key: 'cliente_nome',      question: 'Qual o nome do cliente?',                                          filled: false },
      { key: 'data',              question: 'Qual a data do agendamento? (ex: hoje, amanha, 20/06)',            filled: false },
      { key: 'hora',              question: 'Qual o horario? (ex: 14h, 14:30)',                                 filled: false },
      { key: 'profissional_nome', question: 'Qual o profissional? (opcional — pode pular)',                     filled: false, optional: true },
      { key: 'servico_nome',      question: 'Qual o servico? (opcional — pode pular)',                          filled: false, optional: true }
    ],
    reschedule_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento?',  filled: false },
      { key: 'nova_data',    question: 'Qual a nova data? (ex: amanha, 25/06)',   filled: false },
      { key: 'nova_hora',    question: 'Qual o novo horario? (ex: 15h)',          filled: false }
    ],
    cancel_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento a cancelar?',   filled: false },
      { key: 'data',         question: 'Qual a data do agendamento? (opcional — pode pular)', filled: false, optional: true }
    ],
    confirm_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento a confirmar?',  filled: false },
      { key: 'data',         question: 'Qual a data do agendamento? (opcional — pode pular)', filled: false, optional: true }
    ],
    conclude_appointment: [
      { key: 'cliente_nome', question: 'Qual o nome do cliente do agendamento a concluir?',   filled: false },
      { key: 'data',         question: 'Qual a data do agendamento? (opcional — pode pular)', filled: false, optional: true }
    ],
    create_client: [
      { key: 'nome',     question: 'Qual o nome do cliente?',                  filled: false },
      { key: 'telefone', question: 'Qual o telefone? (opcional — pode pular)', filled: false, optional: true },
      { key: 'email',    question: 'Qual o email? (opcional — pode pular)',     filled: false, optional: true }
    ],
    update_client: [
      { key: 'nome',     question: 'Qual o nome do cliente a atualizar?',     filled: false },
      { key: 'telefone', question: 'Novo telefone? (opcional — pode pular)',  filled: false, optional: true },
      { key: 'email',    question: 'Novo email? (opcional — pode pular)',      filled: false, optional: true }
    ],
    create_professional: [
      { key: 'nome',          question: 'Qual o nome do profissional?',             filled: false },
      { key: 'especialidade', question: 'Qual a especialidade? (opcional)',          filled: false, optional: true },
      { key: 'telefone',      question: 'Qual o telefone? (opcional)',               filled: false, optional: true }
    ],
    update_professional: [
      { key: 'nome',          question: 'Qual o nome do profissional a editar?',      filled: false },
      { key: 'especialidade', question: 'Nova especialidade? (opcional — pode pular)', filled: false, optional: true },
      { key: 'telefone',      question: 'Novo telefone? (opcional — pode pular)',      filled: false, optional: true }
    ],
    create_service: [
      { key: 'nome',            question: 'Qual o nome do servico?',                filled: false },
      { key: 'preco',           question: 'Qual o preco? (ex: 50.00 — pode pular)', filled: false, optional: true },
      { key: 'duracao_minutos', question: 'Qual a duracao em minutos? (ex: 60)',    filled: false, optional: true }
    ],
    update_service: [
      { key: 'nome',            question: 'Qual o nome do servico a editar?',                 filled: false },
      { key: 'nome_novo',       question: 'Novo nome para o servico? (opcional — pode pular)', filled: false, optional: true },
      { key: 'preco',           question: 'Novo preco em R$? (opcional — pode pular)',         filled: false, optional: true },
      { key: 'duracao_minutos', question: 'Nova duracao em minutos? (opcional — pode pular)',  filled: false, optional: true }
    ],
    disable_client:          [{ key: 'nome', question: 'Qual o nome do cliente a desativar?',       filled: false }],
    disable_professional:    [{ key: 'nome', question: 'Qual o nome do profissional a desativar?',  filled: false }],
    disable_service:         [{ key: 'nome', question: 'Qual o nome do servico a desativar?',       filled: false }],
    delete_client:           [{ key: 'nome', question: 'Qual o nome do cliente a excluir?',         filled: false }],
    delete_professional:     [{ key: 'nome', question: 'Qual o nome do profissional a excluir?',    filled: false }],
    delete_service:          [{ key: 'nome', question: 'Qual o nome do servico a excluir?',         filled: false }],
    reactivate_client:       [{ key: 'nome', question: 'Qual o nome do cliente a reativar?',        filled: false }],
    reactivate_professional: [{ key: 'nome', question: 'Qual o nome do profissional a reativar?',   filled: false }],
    reactivate_service:      [{ key: 'nome', question: 'Qual o nome do servico a reativar?',        filled: false }]
  };

  return (definitions[intentName] || []).map(s => ({ ...s }));
}

// ─── Extrai valor por tipo de slot ────────────────────────────────────────────
function extractSlotValue(key, message) {
  const text = normalizeText(message);

  if (key === 'data' || key === 'nova_data') {
    if (matchAny(text, ['pular', 'tanto faz', 'qualquer', 'nao sei', 'sem data', 'passa', 'nao tenho'])) return '__skip__';
    return parseDate(message) || null;
  }

  if (key === 'hora' || key === 'nova_hora') {
    if (matchAny(text, ['pular', 'tanto faz', 'qualquer', 'nao sei', 'passa'])) return '__skip__';
    return parseTime(message) || null;
  }

  if (matchAny(text, ['pular', 'nao', 'nao tem', 'sem', 'nenhum', 'nenhuma', 'passa', 'tanto faz', 'nao tenho', 'nao quero informar'])) {
    return '__skip__';
  }

  const cleaned = message.trim();
  return cleaned.length >= 2 ? cleaned : null;
}

// ─── Extrai parâmetros de mensagem livre ──────────────────────────────────────
function extractParams(message) {
  const params = {};

  const data = parseDate(message);
  if (data) params.data = data;

  const hora = parseTime(message);
  if (hora) params.hora = hora;

  const clienteMatch = message.match(/(?:cliente|para|de|nome)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i);
  if (clienteMatch) params.cliente_nome = clienteMatch[1].trim();

  const profMatch = message.match(/(?:profissional|com|pelo profissional)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i);
  if (profMatch) params.profissional_nome = profMatch[1].trim();

  const servicoMatch = message.match(/(?:servico|serviço|para o servico|para o serviço)[:\s]+([A-Za-zÀ-ÿ\s]{2,40}?)(?:\s+(?:dia|data|as|às|horario|no dia|em|\d)|$)/i);
  if (servicoMatch) params.servico_nome = servicoMatch[1].trim();

  return params;
}


// ─── Detecta intenção de geração de conteúdo ─────────────────────────────────
function detectContentIntent(text, original) {
  const isContent = matchAny(text, [
    'gera texto', 'gerar texto', 'cria texto', 'criar texto',
    'escreve', 'escrever', 'redige', 'redigir',
    'post instagram', 'post para instagram', 'post no instagram',
    'mensagem whatsapp', 'mensagem para whatsapp', 'texto whatsapp',
    'comunicado', 'aviso', 'promocao', 'promoção', 'descricao servico',
    'texto para', 'texto de', 'gera um post', 'cria um post',
    'me ajuda a escrever', 'me ajuda escrever', 'texto profissional',
    'post para redes', 'publicar', 'publicacao'
  ]);
  if (!isContent) return null;

  let tipo = 'post_whatsapp';
  if (matchAny(text, ['instagram', 'insta', 'feed', 'reels', 'stories'])) tipo = 'post_instagram';
  else if (matchAny(text, ['comunicado', 'formal', 'aviso oficial']))      tipo = 'comunicado';
  else if (matchAny(text, ['promocao', 'promoção', 'oferta', 'desconto'])) tipo = 'promocao';
  else if (matchAny(text, ['aviso', 'informativo', 'alerta']))             tipo = 'aviso';
  else if (matchAny(text, ['descricao', 'descrição', 'servico', 'serviço'])) tipo = 'descricao_servico';

  // Extrai o tema removendo palavras-chave de comando
  const tema = original
    .replace(/gera|gerar|cria|criar|escreve|escrever|redige|redigir|post|texto|mensagem|comunicado|aviso|promoção|promocao|para|instagram|whatsapp|insta/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'sobre nossos serviços';

  return { tipo, tema, detalhes: '', tom: 'profissional' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function matchAny(text, terms) {
  return terms.some(term => text.includes(normalizeText(term)));
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function greet() {
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  return randomPick([
    `${saudacao}! 👋 Sou a VyXora AI. Como posso te ajudar hoje?\n\nPode me pedir para agendar, consultar, cadastrar ou tirar dúvidas sobre o painel. Estou aqui!`,
    `${saudacao}! 😊 Pode falar — estou pronta para te ajudar com agendamentos, clientes, relatórios e muito mais!`,
    `${saudacao}! ✨ VyXora AI no ar. O que você precisa hoje?`
  ]);
}

function fallbackAnswer(message) {
  return `Não entendi muito bem "${message}". 🤔\n\nVeja o que posso fazer:\n\n📅 Agendamentos: "agendar", "reagendar", "cancelar", "confirmar"\n👥 Clientes: "listar clientes", "cadastrar cliente"\n👤 Profissionais: "listar profissionais", "cadastrar profissional"\n✦ Serviços: "listar serviços", "cadastrar serviço"\n📊 Relatórios: "painel", "faturamento", "agendamentos hoje"\n\nOu pergunte "como faço para..." que te explico passo a passo!`;
}

function helpMessage() {
  return `Aqui está tudo que posso fazer por você: 🚀\n\n📅 AGENDAMENTOS\n• "agendar [cliente] para [data] às [hora]"\n• "reagendar agendamento do [cliente]"\n• "cancelar agendamento do [cliente]"\n• "confirmar agendamento do [cliente]"\n• "concluir agendamento do [cliente]"\n• "listar agendamentos"\n\n👥 CLIENTES\n• "listar clientes"\n• "cadastrar cliente"\n• "editar cliente"\n• "desativar / excluir / reativar cliente"\n\n👤 PROFISSIONAIS\n• "listar profissionais"\n• "cadastrar profissional"\n• "editar / desativar / excluir profissional"\n\n✦ SERVIÇOS\n• "listar serviços"\n• "cadastrar serviço"\n• "editar / desativar / excluir serviço"\n\n📊 RELATÓRIOS\n• "painel" — resumo geral\n• "agendamentos hoje / amanhã"\n• "faturamento" / "faturamento de junho"\n• "horários livres para amanhã"\n• "clientes inativos"\n• "agendamentos pendentes"\n\nPode digitar de forma natural, sem padrão exato. 😊`;
}

function helpAgendamentos() {
  return `📅 Como gerenciar agendamentos:\n\nCriar:\nDiga "agendar" ou já mande tudo: "agendar Maria para amanhã às 14h"\n\nReagendar:\n"reagendar agendamento do [nome do cliente]"\n\nCancelar:\n"cancelar agendamento do [nome do cliente]"\n\nConfirmar:\n"confirmar agendamento do [nome do cliente]"\n\nConcluir:\n"concluir agendamento do [nome do cliente]"\n\nVer agendamentos:\n• "listar agendamentos"\n• "agendamentos hoje"\n• "agendamentos amanhã"\n• "agendamentos pendentes"`;
}

function helpClientes() {
  return `👥 Como gerenciar clientes:\n\nCadastrar:\n"cadastrar cliente" — vou pedir nome, telefone e email (opcionais)\n\nListar:\n"listar clientes" ou "meus clientes"\n\nEditar:\n"editar cliente [nome]"\n\nDesativar:\n"desativar cliente [nome]"\n\nReativar:\n"reativar cliente [nome]"\n\nExcluir:\n"excluir cliente [nome]"\n\nVer inativos:\n"clientes inativos"`;
}

function helpProfissionais() {
  return `👤 Como gerenciar profissionais:\n\nCadastrar:\n"cadastrar profissional" — nome, especialidade e telefone (opcionais)\n\nListar:\n"listar profissionais"\n\nEditar:\n"editar profissional [nome]"\n\nDesativar:\n"desativar profissional [nome]"\n\nReativar:\n"reativar profissional [nome]"\n\nExcluir:\n"excluir profissional [nome]"\n\nDica: profissionais desativados não aparecem na agenda mas ficam salvos.`;
}

function helpServicos() {
  return `✦ Como gerenciar serviços:\n\nCadastrar:\n"cadastrar serviço" — nome, preço e duração em minutos (opcionais)\n\nListar:\n"listar serviços"\n\nEditar:\n"editar serviço [nome]"\n\nDesativar:\n"desativar serviço [nome]"\n\nReativar:\n"reativar serviço [nome]"\n\nExcluir:\n"excluir serviço [nome]"\n\nVer mais popular:\n"serviço mais agendado"`;
}

function helpRelatorios() {
  return `📊 Como ver relatórios e financeiro:\n\nPainel geral:\n"painel" ou "resumo" — resumo completo do negócio\n\nFaturamento:\n• "faturamento" — total geral e mês atual\n• "faturamento de junho" — mês específico\n• "quanto ganhei em maio"\n\nAgendamentos:\n• "agendamentos hoje"\n• "agendamentos amanhã"\n• "agendamentos pendentes"\n\nClientes:\n• "clientes inativos"\n• "melhor cliente"\n• "clientes do mês"\n\nProfissionais e serviços:\n• "profissional mais ocupado"\n• "serviço mais popular"`;
}

function helpPainel() {
  return `🖥️ Sobre o painel VyXora:\n\nO painel tem as seguintes seções no menu:\n\n• 📅 Agenda — visualize e gerencie agendamentos\n• 👥 Clientes — cadastre sua base de clientes\n• 👤 Profissionais — gerencie sua equipe\n• ✦ Serviços — configure os serviços oferecidos\n• 📊 Relatórios — faturamento e métricas\n• ⚙️ Configurações — dados da empresa e horários\n\nDica: você não precisa navegar pelo painel para a maioria das tarefas — pode me pedir aqui e eu faço por você!\n\nQuer ajuda com alguma seção específica?`;
}
