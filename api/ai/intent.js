import { executeAction } from './actions.js';
import { runQuery } from './queries.js';
import { getStatistics } from './statistics.js';
import { normalizeText, parseDate, parseTime } from './utils.js';

// ─── Detecta a intenção principal da mensagem ───────────────────────────────
export async function interpretIntent(context, message, fullBody) {
  const text = normalizeText(message);

  // 1. Painel / Estatísticas
  if (matchAny(text, ['painel', 'resumo', 'estatistica', 'dashboard', 'visao geral'])) {
    const stats = await getStatistics(context);
    return { type: 'statistics', data: stats };
  }

  // 2. Relatórios / Consultas
  if (matchAny(text, ['melhor cliente', 'relatorio', 'faturamento', 'receita', 'ganho', 'lucro'])) {
    const queryResult = await runQuery(context, text);
    return { type: 'query', data: queryResult };
  }

  // 3. Consulta de agendamentos
  if (matchAny(text, ['ver agendamento', 'listar agendamento', 'mostrar agendamento', 'quais agendamento', 'agendamentos de hoje', 'agenda de hoje', 'agenda do dia'])) {
    const queryResult = await runQuery(context, text);
    return { type: 'query', data: queryResult };
  }

  // 4. Cancelar agendamento
  if (matchAny(text, ['cancelar', 'recusar', 'excluir agendamento', 'remover agendamento'])) {
    const intent = buildIntent('cancel_appointment', message, fullBody);
    const result = await executeAction(context, intent);
    return { type: 'action', data: result };
  }

  // 5. Reagendar agendamento
  if (matchAny(text, ['reagendar', 'remarcar', 'trocar horario', 'mudar horario', 'alterar data'])) {
    const intent = buildIntent('reschedule_appointment', message, fullBody);
    const result = await executeAction(context, intent);
    return { type: 'action', data: result };
  }

  // 6. Criar agendamento
  if (matchAny(text, ['agendar', 'marcar', 'criar agendamento', 'novo agendamento', 'reservar horario', 'marcar horario'])) {
    const intent = buildIntent('create_appointment', message, fullBody);
    const result = await executeAction(context, intent);
    return { type: 'action', data: result };
  }

  // 7. Criar cliente
  if (matchAny(text, ['cadastrar cliente', 'novo cliente', 'adicionar cliente', 'criar cliente'])) {
    const intent = buildIntent('create_client', message, fullBody);
    const result = await executeAction(context, intent);
    return { type: 'action', data: result };
  }

  // 8. Atualizar cliente
  if (matchAny(text, ['atualizar cliente', 'editar cliente', 'alterar cliente', 'mudar cliente'])) {
    const intent = buildIntent('update_client', message, fullBody);
    const result = await executeAction(context, intent);
    return { type: 'action', data: result };
  }

  // 9. Criar profissional
  if (matchAny(text, ['cadastrar profissional', 'novo profissional', 'adicionar profissional', 'criar profissional'])) {
    const intent = buildIntent('create_professional', message, fullBody);
    const result = await executeAction(context, intent);
    return { type: 'action', data: result };
  }

  // 10. Criar serviço
  if (matchAny(text, ['cadastrar servico', 'novo servico', 'adicionar servico', 'criar servico'])) {
    const intent = buildIntent('create_service', message, fullBody);
    const result = await executeAction(context, intent);
    return { type: 'action', data: result };
  }

  // 11. Consulta livre (fallback inteligente)
  const queryResult = await runQuery(context, text);
  return { type: 'query', data: queryResult };
}

// ─── Monta o objeto de intenção com params extraídos da mensagem ─────────────
function buildIntent(name, message, fullBody) {
  const extracted = extractParams(message);
  return {
    name,
    params: {
      text: message,
      ...extracted,
      ...(fullBody?.params || {})
    }
  };
}

// ─── Extrai parâmetros da mensagem em linguagem natural ──────────────────────
function extractParams(message) {
  const params = {};

  // Data
  const data = parseDate(message);
  if (data) params.data = data;

  // Hora
  const hora = parseTime(message);
  if (hora) params.hora = hora;

  // Nome do cliente — tenta extrair após palavras-chave comuns
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

// ─── Helper: verifica se o texto contém algum dos termos ────────────────────
function matchAny(text, terms) {
  return terms.some(term => text.includes(normalizeText(term)));
}
