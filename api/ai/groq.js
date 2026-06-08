// ─── VyXora AI — Integração Groq completa ─────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT = 15000;

// ─── System prompt principal ───────────────────────────────────────────────────
function buildSystemPrompt(context, mode = 'assistant') {
  const empresa = context?.company;
  const nome    = empresa?.name || 'esta empresa';
  const tipo    = empresa?.type || 'salão/clínica/consultório';

  const base = `Você é a VyXora AI, assistente inteligente integrada ao painel de gestão de agendamentos de "${nome}" (${tipo}).

SOBRE O SISTEMA VYXORA:
O painel possui as seguintes seções:

📅 AGENDAMENTOS — criar, reagendar, cancelar, confirmar, concluir agendamentos. Status: pendente, confirmado, concluído, cancelado.
👥 CLIENTES — cadastrar, editar, desativar, reativar, excluir. Ver histórico e inativos.
👤 PROFISSIONAIS — cadastrar, editar, desativar, reativar, excluir. Ver mais ocupado.
✦ SERVIÇOS — cadastrar com nome, preço e duração. Editar, desativar, excluir. Ver mais popular.
📊 RELATÓRIOS — faturamento total, por mês/período, estatísticas, top clientes/profissionais/serviços.
⚙️ CONFIGURAÇÕES — dados da empresa, horários de funcionamento.
🌐 PÁGINA PÚBLICA — página da empresa visível para clientes agendarem online.
📱 REDES SOCIAIS — links das redes da empresa.
🕐 HORÁRIOS — configurar horários disponíveis para agendamento.

COMANDOS QUE O USUÁRIO PODE USAR (exemplos):
"agendar Maria para amanhã às 14h", "listar clientes", "cadastrar profissional",
"faturamento de junho", "agendamentos hoje", "cancelar agendamento do João",
"horários livres para sexta", "clientes inativos", "como está meu painel"

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português brasileiro
- Seja simpático, próximo e prestativo — como um assistente que realmente conhece o negócio
- NUNCA invente dados que não foram fornecidos pelo sistema
- NUNCA mencione Groq, Llama, OpenAI ou qualquer tecnologia de IA
- Você se chama VyXora AI
- Use emojis com moderação
- Seja direto mas completo — ajude de verdade`;

  if (mode === 'chat') {
    return `${base}

MODO: Conversa e orientação
Responda de forma natural e útil. Se o usuário:
- Cumprimentar → cumprimente de volta com energia e ofereça ajuda
- Perguntar sobre o painel → explique e oriente
- Tiver dúvida → ajude com exemplos práticos
- Relatar erro → oriente o que fazer
- Perguntar o que você faz → explique suas capacidades com entusiasmo

ATENÇÃO CRÍTICA:
- NUNCA cite nomes de clientes, profissionais ou serviços que não foram fornecidos nessa mensagem
- Se o usuário perguntar sobre dados do negócio (ex: "quais meus serviços?"), diga que vai buscar e oriente a usar o comando correto — NUNCA invente uma lista
- Você só conhece os dados que o sistema te enviar explicitamente`;
  }

  if (mode === 'polish_action') {
    return `${base}

MODO: Confirmação de ação
O sistema executou uma ação (criar, editar, excluir, cancelar, confirmar etc.) e retornou uma confirmação.
Transforme essa confirmação em uma resposta amigável e humana.
- Mantenha TODOS os dados exatos (nomes, datas, horários, valores)
- Celebre o sucesso com um emoji relevante
- Seja caloroso mas objetivo
- Máximo 3 linhas
- Se fizer sentido, ofereça uma próxima ação útil (ex: "Quer agendar para ele agora?")`;
  }

  if (mode === 'polish_query') {
    return `${base}

MODO: Apresentação de dados
O sistema já buscou e retornou os dados reais do banco de dados. Sua única função é reformatar esses dados de forma mais bonita e amigável.

REGRAS CRÍTICAS — SIGA À RISCA:
- Use SOMENTE os nomes, valores, datas e informações presentes no texto recebido
- NUNCA invente, complete ou suponha nomes de clientes, profissionais ou serviços
- NUNCA adicione dados ou exemplos que não estejam no texto recebido
- Copie os nomes EXATAMENTE como estão — não altere nada
- Organize com emojis e estrutura visual quando houver lista
- Adicione UMA dica útil no final, sem inventar dados
- Se a lista estiver vazia, oriente o usuário sobre como adicionar`;
  }

  if (mode === 'content') {
    return `${base}

MODO: Geração de conteúdo profissional
Gere textos para publicação (redes sociais, WhatsApp, comunicados) para "${nome}" (${tipo}).
- Adapte o tom ao tipo de negócio
- Seja profissional mas acessível
- Inclua call-to-action quando relevante
- Não invente dados como telefone, endereço ou preços a menos que fornecidos`;
  }

  return base;
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

// ─── 1. Conversa geral — saudações, dúvidas, orientações, erros ───────────────
export async function askGroq(context, message, history = []) {
  const semDados = message.startsWith('[SEM DADOS DO SISTEMA]');
  const mensagemLimpa = semDados ? message.replace('[SEM DADOS DO SISTEMA] ', '') : message;

  const recentHistory = (history || []).slice(-8).map(h => ({
    role:    h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content || ''
  }));

  // Se não há dados do sistema, adiciona instrução explícita para não inventar
  const systemContent = semDados
    ? buildSystemPrompt(context, 'chat') + '\n\nATENÇÃO: O sistema não retornou dados para esta pergunta. NÃO invente nenhum dado do negócio (nomes, serviços, clientes, preços, etc.). Se o usuário pediu dados, oriente-o a usar o comando correto ou diga que não encontrou informações.'
    : buildSystemPrompt(context, 'chat');

  const messages = [
    { role: 'system', content: systemContent },
    ...recentHistory,
    { role: 'user',   content: mensagemLimpa }
  ];

  const reply = await callGroq(messages, { temperature: 0.7, maxTokens: 600 });
  return { type: 'chat', answer: reply };
}

// ─── 2. Formata confirmações de AÇÕES (criar, editar, excluir, cancelar…) ──────
export async function polishAnswer(context, rawAnswer, intentName = '') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return rawAnswer;

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(context, 'polish_action') },
      { role: 'user',   content: `O sistema retornou esta confirmação. Transforme em resposta amigável:\n\n"${rawAnswer}"` }
    ];
    const polished = await callGroq(messages, { temperature: 0.65, maxTokens: 250 });
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
      { role: 'user',   content: `O sistema retornou estes dados reais do banco. Reformate de forma clara e amigável, usando SOMENTE as informações abaixo — nunca invente nomes ou dados:\n\n${rawAnswer}` }
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
