import { normalizeText, parseDate, parseTime } from './utils.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function extractAfter(raw, patterns) {
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,;!?]+$/, '');
  }
  return '';
}

function extractMoney(raw) {
  const match = normalizeText(raw).match(
    /(?:r\$|\bpreco\b|\bvalor\b)?\s*(\d+(?:[,.]\d{1,2})?)/
  );
  return match ? Number(match[1].replace(',', '.')) : undefined;
}

function clarify(question, hint = '') {
  return { domain: 'clarification', name: 'ask', params: { question, hint } };
}

function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

// ─── detecção temporal ────────────────────────────────────────────────────────
// Trabalha sobre texto JÁ normalizado (sem acento, lowercase)
// Cobre: hoje, amanha, depois de amanha, dia X, às/as X, Xh, meses, datas numéricas

function temTemporal(t) {
  return /\b(hoje|amanha|depois\s*de\s*amanha|dia\s+\d{1,2}|as\s+\d{1,2}|\d{1,2}\s*h\d{0,2}|\d{1,2}[\/\-]\d{1,2}|hora|horario|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(t);
}

// ─── detector de ambiguidade GLOBAL ──────────────────────────────────────────
// Roda ANTES de qualquer intent.
// criar + entidade + referência temporal = ambíguo → sempre clarify, nunca executa.

function detectarAmbiguidade(t) {
  const temCriar        = /\b(crie|criar|cadastre|cadastrar|adicione|adicionar)\b/.test(t);
  const temCliente      = /\bcliente\b/.test(t);
  const temProfissional = /\bprofissional\b/.test(t);
  const temServico      = /\bservico\b/.test(t);
  const temEntidade     = temCliente || temProfissional || temServico;

  if (!temCriar) return null;
  if (!temTemporal(t)) return null;

  // criar + entidade conhecida + data
  if (temEntidade) {
    const entidade  = temCliente ? 'um cliente' : temProfissional ? 'um profissional' : 'um serviço';
    const dataMatch = t.match(/\b(hoje|amanha|depois\s*de\s*amanha|dia\s+\d{1,2}|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
    const quando    = dataMatch ? `para ${dataMatch[0]}` : 'nessa data';
    return clarify(
      `Você quer criar ${entidade} ou criar um agendamento ${quando}?`,
      `Para cadastrar: "Criar cliente Maria"\nPara agendar: "Agendar Maria ${quando} às 14h"`
    );
  }

  // criar sem entidade + data (ex: "criar para amanhã")
  return clarify(
    'Não entendi bem. Deseja criar um agendamento ou cadastrar algo?',
    'Ex: "Agendar João amanhã às 14h" ou "Criar cliente João"'
  );
}

// ─── intenção de agendamento ──────────────────────────────────────────────────
// Cobre imperativo, infinitivo, 3ª pessoa, substantivo e expressões coloquiais

function isAgendamento(t) {
  if (/\b(agende|agendar|agenda|agendamento|agendamentos|marque|marcar)\b/.test(t)) return true;
  if (/\b(bota|coloca|reserva|deixa)\b.{0,20}\b(dia|horario|hora|marcado|agendado)\b/.test(t)) return true;
  // "para amanhã/hoje/dia X" sem verbo de criação
  if (/\bpara\b.{0,10}\b(hoje|amanha|dia\s+\d)/.test(t) && !/\b(crie|criar|cadastre|adicione)\b/.test(t)) return true;
  return false;
}

// ─── extração de nome do cliente em frase de agendamento ─────────────────────

function extrairClienteAgendamento(raw) {
  // Tenta capturar nome entre o verbo e a primeira referência temporal
  const m = raw.match(
    /\b(?:agende|agendar|agenda|agendamento|marque|marcar|bota|coloca|reserva)\s+(?:o |a |para |pro |pra )?([A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)?)\s+(?:hoje|amanha|dia|\d{1,2}[\/\-]|as?\s|às?\s)/i
  );
  if (m?.[1]) return m[1].trim();

  // Fallback: qualquer nome após o verbo
  const f = raw.match(
    /\b(?:agende|agendar|agenda|agendamento|marque|marcar)\s+(?:o |a )?([A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)?)/i
  );
  return f?.[1]?.trim() || '';
}

// ─── extração de nome com stop-words ─────────────────────────────────────────

function extrairNome(raw, bases) {
  const stop = '(?:\\s+(?:telefone|email|e-mail|status|especialidade|preco|valor|duracao|dia|as|amanha|hoje|para|\\d))|$';
  for (const base of bases) {
    const m = raw.match(new RegExp(base + `(.+?)(?:${stop})`, 'i'));
    if (m?.[1]) return m[1].trim().replace(/[.,;!?]+$/, '');
  }
  return '';
}

// ─── intent principal ─────────────────────────────────────────────────────────

export function interpretIntent(message, payload = {}) {
  const raw  = String(message || payload.intent || '').trim();
  const text = normalizeText(raw); // já normalizado: sem acento, lowercase

  // action explícita no payload → passa direto
  if (payload.action) {
    return {
      domain: payload.domain || 'action',
      name:   normalizeText(payload.action).replace(/\s+/g, '_'),
      params: payload.params || payload,
    };
  }

  // ── 1. dashboard/resumo ───────────────────────────────────────────────────
  if (!text || /\b(resumo|dashboard|painel|estatisticas|numeros)\b/.test(text)) {
    return { domain: 'dashboard', name: 'summary', params: {} };
  }

  // ── 2. AMBIGUIDADE GLOBAL ─────────────────────────────────────────────────
  // Intercepta frases mistas ANTES de qualquer intent.
  // Nenhuma frase com "criar + entidade + data" escapa daqui.
  const amb = detectarAmbiguidade(text);
  if (amb) return amb;

  // ── 3. métricas ───────────────────────────────────────────────────────────
  if (/\bquantos?\b/.test(text) || /\bfaturamento\b|\breceita\b/.test(text)) {
    const metric =
      /\bcliente/.test(text)                       ? 'clientes'            :
      /\bprofissional/.test(text)                  ? 'profissionais'       :
      /\bservico\b/.test(text)                     ? 'servicos'            :
      /\bhoje\b/.test(text)                        ? 'agendamentos_hoje'   :
      /\bamanha\b/.test(text)                      ? 'agendamentos_amanha' :
      /\bfaturamento\b|\breceita\b/.test(text)     ? 'faturamento'         :
      'agendamentos';
    return { domain: 'dashboard', name: 'metric', params: { metric } };
  }

  // ── 4. AGENDAMENTO (alta prioridade, antes de "criar") ────────────────────
  if (isAgendamento(text)) {
    const cliente_nome      = payload.cliente_nome      || extrairClienteAgendamento(raw);
    const data              = payload.data              || parseDate(raw);
    const hora              = payload.hora              || parseTime(raw);
    const servico_nome      = payload.servico_nome;
    const profissional_nome = payload.profissional_nome;

    if (!hasValue(cliente_nome) && !hasValue(data) && !hasValue(hora)) {
      return clarify(
        'Para agendar preciso de mais informações. Informe o nome do cliente, a data e o horário.',
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
      name:   'create_appointment',
      params: { cliente_nome, data, hora, servico_nome, profissional_nome, telefone: payload.telefone },
    };
  }

  // ── 5. REAGENDAR ──────────────────────────────────────────────────────────
  if (/\b(reagende|reagendar)\b/.test(text)) {
    const data = payload.data || parseDate(raw);
    const hora = payload.hora || parseTime(raw);
    if (!hasValue(data) && !hasValue(hora)) {
      return clarify('Para reagendar informe a nova data e o novo horário.');
    }
    return { domain: 'action', name: 'reschedule_appointment', params: { ...payload, data, hora } };
  }

  // ── 6. CANCELAR ───────────────────────────────────────────────────────────
  if (/\b(cancele|cancelar|recuse|recusar)\b/.test(text)) {
    return {
      domain: 'action',
      name:   'cancel_appointment',
      params: { ...payload, data: payload.data || parseDate(raw), hora: payload.hora || parseTime(raw) },
    };
  }

  // ── 7. CRIAR ──────────────────────────────────────────────────────────────
  // Só chega aqui se NÃO tem referência temporal (detectarAmbiguidade já interceptou)
  if (/\b(crie|criar|cadastre|cadastrar|adicione|adicionar)\b/.test(text)) {
    const temCliente      = /\bcliente\b/.test(text);
    const temProfissional = /\bprofissional\b/.test(text);
    const temServico      = /\bservico\b/.test(text);
    const qtd             = [temCliente, temProfissional, temServico].filter(Boolean).length;

    if (qtd > 1)  return clarify('Deseja criar um cliente, um profissional ou um serviço?');
    if (qtd === 0) return clarify('O que deseja criar? Um cliente, um profissional ou um serviço?');

    if (temCliente) {
      const nome = payload.nome || extrairNome(raw, ['cliente chamado\\s+', 'cliente\\s+', 'chamado\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do cliente que deseja cadastrar?');
      return { domain: 'action', name: 'create_client', params: { nome, telefone: payload.telefone, email: payload.email } };
    }

    if (temProfissional) {
      const nome = payload.nome || extrairNome(raw, ['profissional chamado\\s+', 'profissional\\s+', 'chamado\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do profissional que deseja cadastrar?');
      return { domain: 'action', name: 'create_professional', params: { nome, especialidade: payload.especialidade, telefone: payload.telefone } };
    }

    if (temServico) {
      const nome = payload.nome || extrairNome(raw, ['servico chamado\\s+', 'servico\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do serviço que deseja cadastrar?');
      return { domain: 'action', name: 'create_service', params: { nome, preco: payload.preco ?? extractMoney(raw), duracao_minutos: payload.duracao_minutos } };
    }
  }

  // ── 8. ATUALIZAR ──────────────────────────────────────────────────────────
  if (/\b(atualize|atualizar|edite|editar|altere|alterar)\b/.test(text)) {
    const temCliente      = /\bcliente\b/.test(text);
    const temProfissional = /\bprofissional\b/.test(text);
    const temServico      = /\bservico\b/.test(text);
    const qtd             = [temCliente, temProfissional, temServico].filter(Boolean).length;

    if (qtd > 1 || qtd === 0) return clarify('O que deseja atualizar? Um cliente, um profissional ou um serviço?');

    const common = {
      telefone: payload.telefone || extractAfter(raw, [/telefone\s+([+\d\s().-]+)/i]),
      email:    payload.email    || extractAfter(raw, [/e-mail\s+(\S+)/i, /email\s+(\S+)/i]),
      status:   payload.status,
    };

    if (temCliente) {
      const nome = payload.nome || extrairNome(raw, ['cliente\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do cliente que deseja atualizar?');
      return { domain: 'action', name: 'update_client', params: { ...common, ...payload, nome } };
    }
    if (temProfissional) {
      const nome = payload.nome || extrairNome(raw, ['profissional\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do profissional que deseja atualizar?');
      return { domain: 'action', name: 'update_professional', params: { ...common, ...payload, nome, especialidade: payload.especialidade } };
    }
    if (temServico) {
      const nome = payload.nome || extrairNome(raw, ['servico\\s+']);
      if (!hasValue(nome)) return clarify('Qual é o nome do serviço que deseja atualizar?');
      return { domain: 'action', name: 'update_service', params: { ...payload, nome, preco: payload.preco ?? extractMoney(raw), duracao_minutos: payload.duracao_minutos } };
    }
  }

  // ── 9. queries analíticas ─────────────────────────────────────────────────
  if (/\bmelhor cliente\b/.test(text))
    return { domain: 'query', name: 'best_client', params: {} };

  if (/\bprofissional\b.*\b(mais|ocupado|atende)\b|\bmais ocupado\b/.test(text))
    return { domain: 'query', name: 'top_professional', params: {} };

  if (/\bservico\b.*\b(mais|vendido)\b/.test(text))
    return { domain: 'query', name: 'top_service', params: {} };

  if (/\bhorarios?\b.*\blivres?\b|\blivres?\b.*\bhorarios?\b|\bdisponiveis\b/.test(text))
    return { domain: 'query', name: 'free_slots', params: { data: parseDate(raw) } };

  if (/\binativos?\b/.test(text))
    return { domain: 'query', name: 'inactive_clients', params: {} };

  if (/\bpendentes?\b/.test(text))
    return { domain: 'query', name: 'pending_appointments', params: {} };

  // ── 10. fallback ──────────────────────────────────────────────────────────
  return { domain: 'dashboard', name: 'summary', params: {} };
}
