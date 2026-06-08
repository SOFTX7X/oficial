// ─── Integração Groq — camada de conversa inteligente ─────────────────────────
// Só é chamada como fallback quando o motor interno não reconhece a intenção.
// Se falhar, o sistema continua funcionando normalmente via fallbackAnswer().

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT = 8000; // 8 segundos — se demorar mais, usa fallback

function buildSystemPrompt(context) {
  const empresa = context?.company;
  const nome    = empresa?.name  || 'esta empresa';
  const tipo    = empresa?.type  || 'salão/clínica';

  return `Você é a VyXora AI, assistente inteligente integrada ao painel de agendamentos de "${nome}" (${tipo}).

Você ajuda o usuário a gerenciar agendamentos, clientes, profissionais e serviços através de comandos de texto.

Regras importantes:
- Responda sempre em português brasileiro, de forma simpática e objetiva.
- Se o usuário quiser criar, editar, cancelar ou consultar algo no sistema, oriente-o a usar comandos como: "agendar", "cancelar agendamento", "listar clientes", "cadastrar profissional", etc.
- Nunca invente dados do sistema (clientes, agendamentos, faturamento). Para consultas reais, diga ao usuário para usar os comandos específicos.
- Seja direto. Respostas curtas são melhores que longas.
- Não mencione que você usa Groq, Llama ou qualquer tecnologia externa. Você é a VyXora AI.`;
}

export async function askGroq(context, message, history = []) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada.');
  }

  // Monta histórico para contexto de conversa (últimas 6 mensagens)
  const recentHistory = (history || []).slice(-6).map(h => ({
    role:    h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content || ''
  }));

  const messages = [
    { role: 'system',  content: buildSystemPrompt(context) },
    ...recentHistory,
    { role: 'user',    content: message }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT);

  try {
    const response = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages,
        max_tokens:  512,
        temperature: 0.7
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

    return { type: 'chat', answer: reply };

  } finally {
    clearTimeout(timer);
  }
}
