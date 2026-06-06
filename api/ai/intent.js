import { normalizeText, parseDate, parseTime } from './utils.js';

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

export function interpretIntent(message, payload = {}) {
  const raw = String(message || payload.intent || '').trim();
  const text = normalizeText(raw);

  if (payload.action) {
    return { domain: payload.domain || 'action', name: normalizeText(payload.action).replace(/\s+/g, '_'), params: payload.params || payload };
  }

  if (!text || /\b(resumo|dashboard|painel|estatisticas|numeros)\b/.test(text)) {
    return { domain: 'dashboard', name: 'summary', params: {} };
  }

  if (/\bquantos?\b/.test(text) || /\bfaturamento\b|\breceita\b/.test(text)) {
    const metric =
      /\bcliente/.test(text) ? 'clientes' :
      /\bprofissional/.test(text) ? 'profissionais' :
      /\bservico\b|\bserviço\b/.test(text) ? 'servicos' :
      /\bhoje\b/.test(text) ? 'agendamentos_hoje' :
      /\bamanha\b/.test(text) ? 'agendamentos_amanha' :
      /\bfaturamento\b|\breceita\b/.test(text) ? 'faturamento' :
      'agendamentos';
    return { domain: 'dashboard', name: 'metric', params: { metric } };
  }

  if (/\b(crie|criar|cadastre|cadastrar|adicione|adicionar)\b/.test(text)) {
    if (/\bcliente\b/.test(text)) {
      return { domain: 'action', name: 'create_client', params: { nome: payload.nome || extractAfter(raw, [/cliente chamado\s+(.+)$/i, /cliente\s+(.+)$/i, /chamado\s+(.+)$/i]), telefone: payload.telefone, email: payload.email } };
    }
    if (/\bprofissional\b/.test(text)) {
      return { domain: 'action', name: 'create_professional', params: { nome: payload.nome || extractAfter(raw, [/profissional chamado\s+(.+)$/i, /profissional\s+(.+)$/i, /chamado\s+(.+)$/i]), especialidade: payload.especialidade, telefone: payload.telefone } };
    }
    if (/\bservico\b|\bserviço\b/.test(text)) {
      return { domain: 'action', name: 'create_service', params: { nome: payload.nome || extractAfter(raw, [/(?:servico|serviço) chamado\s+(.+)$/i, /(?:servico|serviço)\s+(.+)$/i]), preco: payload.preco ?? extractMoney(raw), duracao_minutos: payload.duracao_minutos } };
    }
  }

  if (/\b(atualize|atualizar|edite|editar|altere|alterar)\b/.test(text)) {
    const common = { telefone: payload.telefone || extractAfter(raw, [/telefone\s+([+\d\s().-]+)/i]), email: payload.email || extractAfter(raw, [/e-mail\s+(\S+)/i, /email\s+(\S+)/i]), status: payload.status };
    if (/\bcliente\b/.test(text)) return { domain: 'action', name: 'update_client', params: { ...common, ...payload, nome: payload.nome || extractAfter(raw, [/cliente\s+(.+?)(?:\s+telefone|\s+email|\s+e-mail|\s+status|$)/i]) } };
    if (/\bprofissional\b/.test(text)) return { domain: 'action', name: 'update_professional', params: { ...common, ...payload, nome: payload.nome || extractAfter(raw, [/profissional\s+(.+?)(?:\s+telefone|\s+especialidade|\s+status|$)/i]), especialidade: payload.especialidade } };
    if (/\bservico\b|\bserviço\b/.test(text)) return { domain: 'action', name: 'update_service', params: { ...payload, nome: payload.nome || extractAfter(raw, [/(?:servico|serviço)\s+(.+?)(?:\s+preco|\s+preço|\s+valor|\s+duracao|\s+duração|\s+status|$)/i]), preco: payload.preco ?? extractMoney(raw), duracao_minutos: payload.duracao_minutos } };
  }

  if (/\b(agende|agendar|marque|marcar)\b/.test(text)) {
    return { domain: 'action', name: 'create_appointment', params: { cliente_nome: payload.cliente_nome || extractAfter(raw, [/(?:agende|agendar|marque|marcar)\s+(.+?)(?:\s+(?:hoje|amanha|amanhã|dia|\d{1,2}[/-]|\d{4}-)|\s+as\s+|\s+às\s+|$)/i]), data: payload.data || parseDate(raw), hora: payload.hora || parseTime(raw), servico_nome: payload.servico_nome, profissional_nome: payload.profissional_nome, telefone: payload.telefone } };
  }

  if (/\b(reagende|reagendar)\b/.test(text)) return { domain: 'action', name: 'reschedule_appointment', params: { ...payload, data: payload.data || parseDate(raw), hora: payload.hora || parseTime(raw) } };
  if (/\b(cancele|cancelar|recuse|recusar)\b/.test(text)) return { domain: 'action', name: 'cancel_appointment', params: { ...payload, data: payload.data || parseDate(raw), hora: payload.hora || parseTime(raw) } };
  if (/\bmelhor cliente\b/.test(text)) return { domain: 'query', name: 'best_client', params: {} };
  if (/\bprofissional\b.*\b(mais|ocupado|atende)\b|\bmais ocupado\b/.test(text)) return { domain: 'query', name: 'top_professional', params: {} };
  if (/\bservico\b.*\b(mais|vendido)\b|\bserviço\b.*\b(mais|vendido)\b/.test(text)) return { domain: 'query', name: 'top_service', params: {} };
  if (/\bhorarios?\b.*\blivres?\b|\blivres?\b.*\bhorarios?\b|\bdisponiveis\b|\bdisponíveis\b/.test(text)) return { domain: 'query', name: 'free_slots', params: { data: parseDate(raw) } };
  if (/\binativos?\b/.test(text)) return { domain: 'query', name: 'inactive_clients', params: {} };
  if (/\bpendentes?\b/.test(text)) return { domain: 'query', name: 'pending_appointments', params: {} };

  return { domain: 'dashboard', name: 'summary', params: {} };
}
