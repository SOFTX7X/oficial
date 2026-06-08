// ─── VyXora AI — Integração Groq completa ─────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT = 15000;

// ─── System prompt base mínimo — sem descrever o painel ───────────────────────
function buildSystemPrompt(context, mode = 'chat') {
  const empresa = context?.company;
  const nome    = empresa?.name || 'esta empresa';
  const tipo    = empresa?.type || 'negócio';

  if (mode === 'chat') {
    return `Você é a VyXora AI, assistente do painel de agendamentos de "${nome}" (${tipo}).

REGRAS — SIGA RIGOROSAMENTE:
- Responda SEMPRE em português brasileiro
- Seja simpático e direto
- NUNCA invente dados do negócio: nomes de clientes, serviços, profissionais, preços, configurações, seções do painel
- NUNCA descreva funcionalidades do painel como se soubesse que existem — você só sabe o que o sistema te enviar
- Se o usuário pedir dados (clientes, serviços, agendamentos, faturamento, etc.) e você não os recebeu, responda: "Não encontrei essa informação. Tente digitar o comando novamente."
- NUNCA mencione Groq, Llama, OpenAI ou qualquer IA
- Você se chama VyXora AI`;
  }

  if (mode === 'polish_action') {
    return `Você é a VyXora AI, assistente do painel de agendamentos de "${nome}".

TAREFA: O sistema executou uma ação e retornou uma confirmação. Transforme em resposta amigável.
- Mantenha TODOS os dados exatos (nomes, datas, horários, valores) — não altere nada
- Adicione emoji relevante
- Seja caloroso e objetivo
- Máximo 3 linhas
- NUNCA invente informações além do que foi confirmado
- Responda em português brasileiro`;
  }

  if (mode === 'polish_query') {
    return `Você é a VyXora AI, assistente do painel de agendamentos de "${nome}".

TAREFA: O sistema retornou dados reais do banco. Reformate de forma clara e amigável.
- Use SOMENTE os dados presentes no texto abaixo — nenhum a mais
- Copie nomes, valores e datas EXATAMENTE como estão
- NUNCA invente, complete ou adicione qualquer dado
- Organize com emojis quando houver lista
- Adicione no máximo uma dica curta no final, sem citar dados que não foram fornecidos
- Responda em português brasileiro`;
  }

  if (mode === 'content') {
    return `Você é a VyXora AI, assistente do painel de agendamentos de "${nome}" (${tipo}).

TAREFA: Gere o texto solicitado para a empresa.
- Adapte o tom ao tipo de negócio (${tipo})
- Não invente dados como telefone, endereço ou preços a menos que fornecidos
- Responda em português brasileiro`;
  }

  return `Você é a VyXora AI, assistente do painel de agendamentos de "${nome}". Responda em português brasileiro de forma simpática e direta.`;
}

// ─── Chamada base ao Groq ──────────────────────────────────────────────────────
async function callGroq(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages,
        max_tokens:  options.maxTokens  || 512,
        temperature: options.temperature || 0.7
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq retornou ${response.status}: ${err}`);
    }

    const data  = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Resposta vazia da Groq.');
    return reply;

  } finally {
    clearTimeout(timer);
  }
}

// ─── 1. Conversa geral — saudações, dúvidas, orientações ──────────────────────
export async function askGroq(context, message, history = []) {
  const recentHistory = (history || []).slice(-8).map(h => ({
    role:    h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content || ''
  }));

  const messages = [
    { role: 'system', content: buildSystemPrompt(context, 'chat') },
    ...recentHistory,
    { role: 'user',   content: message }
  ];

  const reply = await callGroq(messages, { temperature: 0.7, maxTokens: 400 });
  return { type: 'chat', answer: reply };
}

// ─── 2. Formata confirmações de AÇÕES vindas da API ───────────────────────────
export async function polishAnswer(context, rawAnswer, intentName = '') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return rawAnswer;

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(context, 'polish_action') },
      { role: 'user',   content: `Confirmação do sistema:\n\n"${rawAnswer}"` }
    ];
    const polished = await callGroq(messages, { temperature: 0.4, maxTokens: 200 });
    return polished;
  } catch {
    return rawAnswer;
  }
}

// ─── 3. Formata dados de CONSULTAS vindos da API ───────────────────────────────
export async function polishQueryAnswer(context, rawAnswer) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return rawAnswer;
  if (!rawAnswer || rawAnswer.length < 20) return rawAnswer;

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(context, 'polish_query') },
      { role: 'user',   content: `Dados retornados pelo sistema:\n\n${rawAnswer}` }
    ];
    const polished = await callGroq(messages, { temperature: 0.3, maxTokens: 700 });
    return polished;
  } catch {
    return rawAnswer;
  }
}

// ─── 4. Gera textos profissionais para publicação ─────────────────────────────
export async function generateContent(context, request) {
  const { tipo = 'post_whatsapp', tema, detalhes = '', tom = 'profissional' } = request;

  const empresa     = context?.company;
  const nomeEmpresa = empresa?.name || 'nossa empresa';
  const tipoEmpresa = empresa?.type || 'negócio';

  const tipoDescricao = {
    post_instagram:    'post para Instagram (máx. 150 palavras, use hashtags relevantes no final)',
    post_whatsapp:     'mensagem para WhatsApp (máx. 100 palavras, direto ao ponto)',
    comunicado:        'comunicado formal (máx. 200 palavras, tom sério e profissional)',
    promocao:          'texto promocional (destaque o benefício, crie urgência, máx. 120 palavras)',
    aviso:             'aviso importante (breve, claro, máx. 80 palavras)',
    descricao_servico: 'descrição de serviço (persuasiva, destaque os benefícios, máx. 100 palavras)'
  }[tipo] || 'texto (máx. 150 palavras)';

  const prompt = `Gere um ${tipoDescricao} para "${nomeEmpresa}" (${tipoEmpresa}).
Tema: ${tema}
${detalhes ? `Detalhes: ${detalhes}` : ''}
Tom: ${tom}
Retorne apenas o texto final, sem explicações ou títulos.`;

  const messages = [
    { role: 'system', content: buildSystemPrompt(context, 'content') },
    { role: 'user',   content: prompt }
  ];

  const content = await callGroq(messages, { temperature: 0.8, maxTokens: 400 });
  return { type: 'content', answer: content };
}
