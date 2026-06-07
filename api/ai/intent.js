import { normalizeText, parseDate, parseTime } from './utils.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function extractAfter(raw, patterns) {
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,;!?]+$/, '');
  }
  return '';
}

function extractMoney(raw) {
  const match = normalizeText(raw).match(/(?:r\$|\bpreco\b|\bpreço\b|\bvalor\b)?\s*(\d+(?:[,.]\d{1,2})?)/);
  return match ? Number(match[1].replace(',', '.')) : undefined;
}

function clarify(question, hint = '') {
  return { domain: 'clarification', name: 'ask', params: { question, hint } };
}

function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

// ─── detecção de intenção de agendamento por contexto ───────────────────────
// Cobre: imperativo, infinitivo, 3ª pessoa, substantivo, expressões coloquiais

function isAgendamentoIntent(text, raw) {
  // Verbos diretos: agende, agendar, agenda, agendamento, marque, marcar
  if (/\b(agende|agendar|agenda|agendamento|agendamentos|marque|marcar)\b/.test(text)) return true;

  // Expressões coloquiais: "bota no dia", "coloca pra", "reserva pra", "deixa marcado"
  if (/\b(bota|coloca|reserva|deixa)\b.{0,20}\b(dia|horario|hora|marcado|agendado)\b/.test(text)) return true;

  // "para o dia X", "para amanhã às", "pro dia X às Xh" sem verbo de criação
  if (/\bpara\b.{0,10}\b(hoje|amanha|amanhã|dia\s+\d)/.test(text) && !/\b(crie|criar|cadastre|adicione)\b/.test(text)) return true;

  return false;
}

// ─── detecção de referência forte a data/horário ─────────────────────────────

function temReferenciaTemporal(text) {
  return /\b(hoje|amanha|amanhã|dia\s+\d{1,2}|às?\s*\d{1,2}|\d{1,2}[\/\-]\d{1,2}|horas?|horario|horário|\d{1,2}h\d{0,2})\b/.test(text);
}

// ─── extração de nomes com lookahead para stop-words ────────────────────────

function extractName(raw, entityPatterns) {
  const stopWords = '(?:\\s+(?:telefone|email|e-mail|status|especialidade|preco|preço|valor|duracao|duração|dia|as|às|amanha|amanhã|hoje|para|às?\\s+\\d))|$';
  for (const base of entityPatterns) {
    const pattern = new RegExp(base + `(.+?)(?:${stopWords})`, 'i');
    const match = raw.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,;!?]+$/, '');
  }
  return '';
}

// ─── extração inteligente de nome de cliente para agendamento ────────────────
// Captura o nome entre o verbo de agendamento e a primeira referência temporal

function extractClienteFromAgendamento(raw) {
  // "agende/agenda/marque NOME amanhã/dia/às..."
  const match = raw.match(
    /\b(?:agende|agendar|agenda|agendamento|marque|marcar|bota|coloca|reserva)\s+(?:o\s+|a\s+|para\s+|pro\s+|pra\s+)?([A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)?)\s+(?:hoje|amanha|amanhã|dia|\d{1,2}[\/\-]|às?|as\s)/i
  );
  if (match?.[1]) return match[1].trim();

  // fallback: qualquer nome próprio após o verbo
  const fallback = raw.match(
    /\b(?:agende|agendar|agenda|agendamento|marque|marcar)\s+(?:o\s+|a\s+)?([A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)?)/i
  );
  return fallback?.[1]?.trim() || '';
}

// ─── intent principal ────────────────────────────────────────────────────────

export function interpretIntent(message, payload = {}) {
  const raw = String(message || payload.intent || '').trim();
  const text = normalizeText(raw);

  // Payload com action explícita — passa direto
  if (payload.action) {
    return {
      domain: payload.domain || 'action',
      name: normalizeText(payload.action).replace(/\s+/g, '_'),
      params: payload.params || payload,
    };
  }

  // ── dashboard / resumo ───────────────────────────────────────────────────
  if (!text || /\b(resumo|dashboard|painel|estatisticas|numeros)\b/.test(text)) {
    return { domain: 'dashboard', name: 'summary', params: {} };
  }

  // ── métricas quantitativas ───────────────────────────────────────────────
  if (/\bquantos?\b/.test(text) || /\bfaturamento\b|\breceita\b/.test(text)) {
    const metric =
      /\bcliente/.test(text)                   ? 'clientes' :
      /\bprofissional/.test(text)              ? 'profissionais' :
      /\bservico\b|\bserviço\b/.test(text)     ? 'servicos' :
      /\bhoje\b/.test(text)                    ? 'agendamentos_hoje' :
      /\bamanha\b/.test(text)                  ? 'agendamentos_amanha' :
      /\bfaturamento\b|\breceita\b/.test(text) ? 'faturamento' :
      'agendamentos';
    return { domain: 'dashboard', name: 'metric', params: { metric } };
  }

  // ── AGENDAMENTO — detecção ampla e inteligente, antes de qualquer "criar" ──

  if (isAgendamentoIntent(text, raw)) {
    const cliente_nome      = payload.cliente_nome      || extractClienteFromAgendamento(raw);
    const data              = payload.data              || parseDate(raw);
    const hora              = payload.hora              || parseTime(raw);
    const servico_nome      = payload.servico_nome;
    const profissional_nome = payload.profissional_nome;

    if (!hasValue(cliente_nome) && !hasValue(data) && !hasValue(hora)) {
      return clarify(
        'Para agendar, preciso de mais informações. Pode me informar o nome do cliente, a data e o horário?',
        'Ex: "Agendar João amanhã às 14h"'
      );
    }
    if (!hasValue(cliente_nome)) {
      return clarify('Qual é o nome do cliente para este agendamento?');
    }
    if (!hasValue(data)) {
      return clarify(`Para quando deseja agendar ${cliente_nome}? Informe a data.`);
    }
    if (!hasValue(hora)) {
      return clarify(`Qual horário deseja agendar ${cliente_nome} no dia ${data}?`);
    }

    return {
      domain: 'action',
      name: 'create_appointment',
      params: { cliente_nome, data, hora, servico_nome, profissional_nome, telefone: payload.telefone },
    };
  }

  // ── REAGENDAR ────────────────────────────────────────────────────────────

  if (/\b(reagende|reagendar)\b/.test(text)) {
    const data = payload.data || parseDate(raw);
    const hora = payload.hora || parseTime(raw);
    if (!hasValue(data) && !hasValue(hora)) {
      return clarify('Para reagendar, informe a nova data e o novo horário.');
    }
    return { domain: 'action', name: 'reschedule_appointment', params: { ...payload, data, hora } };
  }

  // ── CANCELAR ─────────────────────────────────────────────────────────────

  if (/\b(cancele|cancelar|recuse|recusar)\b/.test(text)) {
    return {
      domain: 'action',
      name: 'cancel_appointment',
      params: { ...payload, data: payload.data || parseDate(raw), hora: payload.hora || parseTime(raw) },
    };
  }

  // ── CRIAR ────────────────────────────────────────────────────────────────

  if (/\b(crie|criar|cadastre|cadastrar|adicione|adicionar)\b/.test(text)) {
    const temCliente      = /\bcliente\b/.test(text);
    const temProfissional = /\bprofissional\b/.test(text);
    const temServico      = /\bservico\b|\bserviço\b/.test(text);
    const entidades       = [temCliente, temProfissional, temServico].filter(Boolean).length;

    if (entidades > 1) {
      return clarify('Deseja criar um cliente, um profissional ou um serviço?');
    }
    if (entidades === 0) {
      return clarify('O que deseja criar? Um cliente, um profissional ou um serviço?');
    }

    // ── criar cliente ──
    if (temCliente) {
      // Se tem referência temporal forte junto com "criar cliente" → ambíguo
      // Ex: "criar um cliente para o dia 10" pode ser agendamento mal formulado
      if (temReferenciaTemporal(text)) {
        return clarify(
          'Não entendi bem. Deseja cadastrar um novo cliente ou agendar um horário?',
          'Ex para cadastrar: "Criar cliente Maria"\nEx para agendar: "Agendar Maria dia 10 às 14h"'
        );
      }

      const nome = payload.nome || extractName(raw, [
        'cliente chamado\\s+',
        'cliente\\s+',
        'chamado\\s+',
      ]);
      if (!hasValue(nome)) {
        return clarify('Qual é o nome do cliente que deseja cadastrar?');
      }
      return {
        domain: 'action',
        name: 'create_client',
        params: { nome, telefone: payload.telefone, email: payload.email },
      };
    }

    // ── criar profissional ──
    if (temProfissional) {
      const nome = payload.nome || extractName(raw, [
        'profissional chamado\\s+',
        'profissional\\s+',
        'chamado\\s+',
      ]);
      if (!hasValue(nome)) {
        return clarify('Qual é o nome do profissional que deseja cadastrar?');
      }
      return {
        domain: 'action',
        name: 'create_professional',
        params: { nome, especialidade: payload.especialidade, telefone: payload.telefone },
      };
    }

    // ── criar serviço ──
    if (temServico) {
      const nome = payload.nome || extractName(raw, [
        '(?:servico|serviço) chamado\\s+',
        '(?:servico|serviço)\\s+',
      ]);
      if (!hasValue(nome)) {
        return clarify('Qual é o nome do serviço que deseja cadastrar?');
      }
      return {
        domain: 'action',
        name: 'create_service',
        params: { nome, preco: payload.preco ?? extractMoney(raw), duracao_minutos: payload.duracao_minutos },
      };
    }
  }

  // ── ATUALIZAR ────────────────────────────────────────────────────────────

  if (/\b(atualize|atualizar|edite|editar|altere|alterar)\b/.test(text)) {
    const temCliente      = /\bcliente\b/.test(text);
    const temProfissional = /\bprofissional\b/.test(text);
    const temServico      = /\bservico\b|\bserviço\b/.test(text);
    const entidades       = [temCliente, temProfissional, temServico].filter(Boolean).length;

    if (entidades > 1 || entidades === 0) {
      return clarify('O que deseja atualizar? Um cliente, um profissional ou um serviço?');
    }

    const common = {
      telefone: payload.telefone || extractAfter(raw, [/telefone\s+([+\d\s().-]+)/i]),
      email:    payload.email    || extractAfter(raw, [/e-mail\s+(\S+)/i, /email\s+(\S+)/i]),
      status:   payload.status,
    };

    if (temCliente) {
      const nome = payload.nome || extractName(raw, ['cliente\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do cliente que deseja atualizar?');
      return { domain: 'action', name: 'update_client', params: { ...common, ...payload, nome } };
    }

    if (temProfissional) {
      const nome = payload.nome || extractName(raw, ['profissional\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do profissional que deseja atualizar?');
      return { domain: 'action', name: 'update_professional', params: { ...common, ...payload, nome, especialidade: payload.especialidade } };
    }

    if (temServico) {
      const nome = payload.nome || extractName(raw, ['(?:servico|serviço)\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do serviço que deseja atualizar?');
      return { domain: 'action', name: 'update_service', params: { ...payload, nome, preco: payload.preco ?? extractMoney(raw), duracao_minutos: payload.duracao_minutos } };
    }
  }

  // ── queries analíticas ───────────────────────────────────────────────────

  if (/\bmelhor cliente\b/.test(text))
    return { domain: 'query', name: 'best_client', params: {} };

  if (/\bprofissional\b.*\b(mais|ocupado|atende)\b|\bmais ocupado\b/.test(text))
    return { domain: 'query', name: 'top_professional', params: {} };

  if (/\bservico\b.*\b(mais|vendido)\b|\bserviço\b.*\b(mais|vendido)\b/.test(text))
    return { domain: 'query', name: 'top_service', params: {} };

  if (/\bhorarios?\b.*\blivres?\b|\blivres?\b.*\bhorarios?\b|\bdisponiveis\b|\bdisponíveis\b/.test(text))
    return { domain: 'query', name: 'free_slots', params: { data: parseDate(raw) } };

  if (/\binativos?\b/.test(text))
    return { domain: 'query', name: 'inactive_clients', params: {} };

  if (/\bpendentes?\b/.test(text))
    return { domain: 'query', name: 'pending_appointments', params: {} };

  // ── fallback ─────────────────────────────────────────────────────────────
  return { domain: 'dashboard', name: 'summary', params: {} };
}
