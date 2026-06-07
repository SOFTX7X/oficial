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

// Retorna objeto de esclarecimento — compatível com qualquer handler que cheque domain
function clarify(question, hint = '') {
  return { domain: 'clarification', name: 'ask', params: { question, hint } };
}

// Verifica se um valor é "útil" (não vazio, não undefined, não null)
function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

// ─── extração de nomes com lookahead para evitar captura gulosa ──────────────

function extractName(raw, entityPatterns) {
  // Palavras que indicam fim do nome e início de outro campo
  const stopWords = '(?:\\s+(?:telefone|email|e-mail|status|especialidade|preco|preço|valor|duracao|duração|dia|as|às|amanha|amanhã|hoje|às?\\s+\\d))|$';
  for (const base of entityPatterns) {
    const pattern = new RegExp(base + `(.+?)(?:${stopWords})`, 'i');
    const match = raw.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,;!?]+$/, '');
  }
  return '';
}

// ─── intent principal ────────────────────────────────────────────────────────

export function interpretIntent(message, payload = {}) {
  const raw = String(message || payload.intent || '').trim();
  const text = normalizeText(raw);

  // Payload com action explícita — passa direto, sem tocar
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
      /\bcliente/.test(text)               ? 'clientes' :
      /\bprofissional/.test(text)          ? 'profissionais' :
      /\bservico\b|\bserviço\b/.test(text) ? 'servicos' :
      /\bhoje\b/.test(text)                ? 'agendamentos_hoje' :
      /\bamanha\b/.test(text)              ? 'agendamentos_amanha' :
      /\bfaturamento\b|\breceita\b/.test(text) ? 'faturamento' :
      'agendamentos';
    return { domain: 'dashboard', name: 'metric', params: { metric } };
  }

  // ── AGENDAMENTO — vem ANTES de "criar" para evitar colisão com "cliente" ──

  if (/\b(agende|agendar|marque|marcar)\b/.test(text)) {
    const cliente_nome   = payload.cliente_nome  || extractName(raw, ['(?:agende|agendar|marque|marcar)\\s+']);
    const data           = payload.data          || parseDate(raw);
    const hora           = payload.hora          || parseTime(raw);
    const servico_nome   = payload.servico_nome;
    const profissional_nome = payload.profissional_nome;

    // Campos obrigatórios ausentes → pede esclarecimento
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

  if (/\b(reagende|reagendar)\b/.test(text)) {
    const data = payload.data || parseDate(raw);
    const hora = payload.hora || parseTime(raw);
    if (!hasValue(data) && !hasValue(hora)) {
      return clarify('Para reagendar, informe a nova data e o novo horário.');
    }
    return { domain: 'action', name: 'reschedule_appointment', params: { ...payload, data, hora } };
  }

  if (/\b(cancele|cancelar|recuse|recusar)\b/.test(text)) {
    return { domain: 'action', name: 'cancel_appointment', params: { ...payload, data: payload.data || parseDate(raw), hora: payload.hora || parseTime(raw) } };
  }

  // ── CRIAR ────────────────────────────────────────────────────────────────

  if (/\b(crie|criar|cadastre|cadastrar|adicione|adicionar)\b/.test(text)) {
    const temCliente      = /\bcliente\b/.test(text);
    const temProfissional = /\bprofissional\b/.test(text);
    const temServico      = /\bservico\b|\bserviço\b/.test(text);

    // Ambíguo: mais de uma entidade detectada (ex: "crie cliente e profissional")
    const entidades = [temCliente, temProfissional, temServico].filter(Boolean).length;
    if (entidades > 1) {
      return clarify('Deseja criar um cliente, um profissional ou um serviço?');
    }

    // Nenhuma entidade identificada
    if (entidades === 0) {
      return clarify('O que deseja criar? Um cliente, um profissional ou um serviço?');
    }

    if (temCliente) {
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
