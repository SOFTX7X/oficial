import { normalizeText, parseDate, parseTime } from './utils.js';

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

function isAgendamento(t) {
  if (/\b(agende|agendar|agenda|agendamento|agendamentos|marque|marcar)\b/.test(t)) return true;
  if (/\b(bota|coloca|reserva|deixa)\b.{0,20}\b(dia|horario|hora|marcado|agendado)\b/.test(t)) return true;
  if (/\bpara\b.{0,10}\b(hoje|amanha|dia\s+\d)/.test(t) && !/\b(crie|criar|cadastre|adicione)\b/.test(t)) return true;
  return false;
}

function extrairClienteAgendamento(raw) {
  const m = raw.match(
    /\b(?:agende|agendar|agenda|agendamento|marque|marcar|bota|coloca|reserva)\s+(?:o |a |para |pro |pra )?([A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)?)\s+(?:hoje|amanha|dia|\d{1,2}[\/\-]|as?\s|às?\s)/i
  );
  if (m?.[1]) return m[1].trim();
  const f = raw.match(
    /\b(?:agende|agendar|agenda|agendamento|marque|marcar)\s+(?:o |a )?([A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)?)/i
  );
  return f?.[1]?.trim() || '';
}

function extrairNome(raw, bases) {
  const stop = '(?:\\s+(?:telefone|email|e-mail|status|especialidade|preco|valor|duracao|dia|as|amanha|hoje|para|\\d))|$';
  for (const base of bases) {
    const m = raw.match(new RegExp(base + `(.+?)(?:${stop})`, 'i'));
    if (m?.[1]) return m[1].trim().replace(/[.,;!?]+$/, '');
  }
  return '';
}

// ETAPA 1: Lógica robusta que cruza intenções gramaticais com as tabelas reais do Supabase
export function interpretIntent(message, payload = {}, contextData = { listaProfissionais: [], listaServicos: [] }) {
  const raw  = String(message || payload.intent || '').trim();
  const text = normalizeText(raw);

  // Fallbacks seguros de listas dinâmicas injetadas pela API
  const profissionaisValidos = contextData.listaProfissionais || [];
  const servicosValidos = contextData.listaServicos || [];

  // action explícita no payload → passa direto
  if (payload.action) {
    return {
      domain: payload.domain || 'action',
      name:   normalizeText(payload.action).replace(/\s+/g, '_'),
      params: payload.params || payload,
    };
  }

  // Lógica Auxiliar de Mapeamento Contextual Inteligente
  let servicoMapeado = payload.servico_id ? servicosValidos.find(s => s.id === payload.servico_id) : null;
  let profissionalMapeado = payload.profissional_id ? profissionaisValidos.find(p => p.id === payload.profissional_id) : null;

  // Busca textual ativa por serviços se não estiver explícito por ID
  if (!servicoMapeado && servicosValidos.length > 0) {
    for (const svc of servicosValidos) {
      const nomeNormalizado = normalizeText(svc.nome);
      if (nomeNormalizado && text.includes(nomeNormalizado)) {
        servicoMapeado = svc;
        break;
      }
    }
  }

  // Busca textual ativa por profissionais se não estiver explícito por ID
  if (!profissionalMapeado && profissionaisValidos.length > 0) {
    for (const prof of profissionaisValidos) {
      const nomeNormalizado = normalizeText(prof.nome);
      if (nomeNormalizado && text.includes(nomeNormalizado)) {
        profissionalMapeado = prof;
        break;
      }
    }
  }

  // ── RETOMADA DE FLUXO ─────────────────────────────────────────────────────
  if (payload.intent === 'create_appointment') {
    const cliente_nome      = payload.cliente_nome;
    const data              = payload.data;
    const hora              = payload.hora;
    const servico_nome      = servicoMapeado ? servicoMapeado.nome : payload.servico_nome;
    const servico_id        = servicoMapeado ? servicoMapeado.id : payload.servico_id;
    const profissional_nome = profissionalMapeado ? profesionalMapeado.nome : payload.profissional_nome;
    const profissional_id   = profissionalMapeado ? profissionalMapeado.id : payload.profissional_id;

    if (!hasValue(cliente_nome)) {
      return clarify('Qual é o nome do cliente para este agendamento?');
    }
    if (!hasValue(data)) {
      return clarify(`Para quando deseja agendar ${cliente_nome}? Informe a data.`);
    }
    if (!hasValue(hora)) {
      return clarify(`Qual horário deseja agendar ${cliente_nome} no dia ${data}?`);
    }
    if (!hasValue(servico_id) && servicosValidos.length > 0) {
      return clarify(`Qual serviço você gostaria de associar ao agendamento de ${cliente_nome}?`, `Serviços disponíveis: ${servicosValidos.map(s => s.nome).join(', ')}`);
    }
    return {
      domain: 'action',
      name:   'create_appointment',
      params: { 
        cliente_nome, 
        data, 
        hora, 
        servico_nome, 
        servico_id, 
        profissional_nome, 
        profissional_id, 
        telefone: payload.telefone 
      },
    };
  }

  if (payload.intent === 'create_client') {
    const nome = payload.nome;
    if (!hasValue(nome)) return clarify('Qual é o nome do cliente que deseja cadastrar?');
    return { domain: 'action', name: 'create_client', params: { nome, telefone: payload.telefone, email: payload.email } };
  }

  if (payload.intent === 'create_professional') {
    const nome = payload.nome;
    if (!hasValue(nome)) return clarify('Qual é o nome do profissional que deseja cadastrar?');
    return { domain: 'action', name: 'create_professional', params: { nome, especialidade: payload.especialidade, telefone: payload.telefone } };
  }

  if (payload.intent === 'create_service') {
    const nome = payload.nome;
    if (!hasValue(nome)) return clarify('Qual é o nome do serviço que deseja cadastrar?');
    return { domain: 'action', name: 'create_service', params: { nome, preco: payload.preco, duracao_minutos: payload.duracao_minutos } };
  }

  // ── PROTEÇÃO GLOBAL ───────────────────────────────────────────────────────
  {
    const _raw        = raw.toLowerCase();
    const _temCliente = /cliente/.test(_raw);
    const _temTempo   = /(hoje|amanha|amanhã|dia\s*\d|novembro|dezembro|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|às\s*\d|as\s+\d|horário|horario)/.test(_raw);

    if (_temCliente && _temTempo) {
      return {
        domain: 'clarification',
        name: 'ask',
        params: {
          question: 'Você quer criar um cliente ou criar um agendamento?',
          hint: "Ex: 'Criar cliente João' ou 'Agendar João dia 10 de novembro às 14h'"
        }
      };
    }
  }

  // ── dashboard/resumo ──────────────────────────────────────────────────────
  if (!text || /\b(resumo|dashboard|painel|estatisticas|numeros)\b/.test(text)) {
    return { domain: 'dashboard', name: 'summary', params: {} };
  }

  // ── métricas ──────────────────────────────────────────────────────────────
  if (/\bquantos?\b/.test(text) || /\bfaturamento\b|\breceita\b/.test(text)) {
    const metric =
      /\bcliente/.test(text)                   ? 'clientes'            :
      /\bprofissional/.test(text)              ? 'profissionais'       :
      /\bservico\b/.test(text)                 ? 'servicos'            :
      /\bhoje\b/.test(text)                    ? 'agendamentos_hoje'   :
      /\bamanha\b/.test(text)                  ? 'agendamentos_amanha' :
      /\bfaturamento\b|\breceita\b/.test(text) ? 'faturamento'         :
      'agendamentos';
    return { domain: 'dashboard', name: 'metric', params: { metric } };
  }

  // ── agendamento ───────────────────────────────────────────────────────────
  if (isAgendamento(text)) {
    const cliente_nome      = payload.cliente_nome      || extrairClienteAgendamento(raw);
    const data              = payload.data              || parseDate(raw);
    const hora              = payload.hora              || parseTime(raw);
    const servico_nome      = servicoMapeado ? servicoMapeado.nome : (payload.servico_nome || undefined);
    const servico_id        = servicoMapeado ? servicoMapeado.id : (payload.servico_id || undefined);
    const profissional_nome = profissionalMapeado ? profissionalMapeado.nome : (payload.profissional_nome || undefined);
    const profissional_id   = profissionalMapeado ? profissionalMapeado.id : (payload.profissional_id || undefined);

    if (!hasValue(cliente_nome)) {
      return clarify('Qual é o nome do cliente para este agendamento?');
    }
    if (!hasValue(data)) {
      return clarify(`Para quando deseja agendar ${cliente_nome}? Informe a data.`);
    }
    if (!hasValue(hora)) {
      return clarify(`Qual horário deseja agendar ${cliente_nome} no dia ${data}?`);
    }
    if (!hasValue(servico_id) && servicosValidos.length > 0) {
      return clarify(`Qual serviço você gostaria de associar ao agendamento de ${cliente_nome}?`, `Serviços disponíveis: ${servicosValidos.map(s => s.nome).join(', ')}`);
    }
    
    return {
      domain: 'action',
      name:   'create_appointment',
      params: { 
        cliente_nome, 
        data, 
        hora, 
        servico_nome, 
        servico_id, 
        profissional_nome, 
        profissional_id, 
        telefone: payload.telefone 
      },
    };
  }

  // ── reagendar ─────────────────────────────────────────────────────────────
  if (/\b(reagende|reagendar)\b/.test(text)) {
    const data = payload.data || parseDate(raw);
    const hora = payload.hora || parseTime(raw);
    if (!hasValue(data) && !hasValue(hora)) return clarify('Para reagendar informe a nova data e o novo horário.');
    return { domain: 'action', name: 'reschedule_appointment', params: { ...payload, data, hora } };
  }

  // ── cancelar ──────────────────────────────────────────────────────────────
  if (/\b(cancele|cancelar|recuse|recusar)\b/.test(text)) {
    return {
      domain: 'action',
      name:   'cancel_appointment',
      params: { ...payload, data: payload.data || parseDate(raw), hora: payload.hora || parseTime(raw) },
    };
  }

  // ── criar ─────────────────────────────────────────────────────────────────
  if (/\b(crie|criar|cadastre|cadastrar|adicione|adicionar)\b/.test(text)) {
    const temCliente      = /\bcliente\b/.test(text);
    const temProfissional = /\bprofissional\b/.test(text);
    const temServico      = /\bservico\b/.test(text);
    const qtd             = [temCliente, temProfissional, temServico].filter(Boolean).length;

    if (qtd > 1)   return clarify('Deseja criar um cliente, um profissional ou um serviço?');
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

  // ── atualizar ─────────────────────────────────────────────────────────────
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

  // ── queries ───────────────────────────────────────────────────────────────
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

  // ── fallback ──────────────────────────────────────────────────────────────
  return { domain: 'dashboard', name: 'summary', params: {} };
}
