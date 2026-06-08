// ─── VyXora AI — Integração Groq completa ─────────────────────────────────────
// 4 funções principais:
//   1. askGroq()         → fallback inteligente para perguntas livres
//   2. polishAnswer()    → formata/embeleza respostas brutas da API
//   3. generateContent() → gera textos profissionais para publicação
//   4. buildSystemPrompt() → system prompt rico com contexto do painel

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT = 10000;

// ─── System prompt rico com todo o contexto do painel ─────────────────────────
function buildSystemPrompt(context, mode = 'assistant') {
  const empresa = context?.company;
  const nome    = empresa?.name || 'esta empresa';
  const tipo    = empresa?.type || 'salão/clínica/consultório';

  const base = `Você é a VyXora AI, assistente inteligente integrada ao painel de gestão de agendamentos de "${nome}" (${tipo}).

SOBRE O SISTEMA VYXORA:
O painel possui as seguintes seções e funcionalidades:

📅 AGENDAMENTOS
- Criar agendamento: cliente, data, hora, profissional (opcional), serviço (opcional)
- Reagendar: alterar data e horário de um agendamento existente
- Cancelar, Confirmar ou Concluir agendamentos
- Visualizar agenda do dia, semana ou período
- Status possíveis: pendente, confirmado, concluído, cancelado

👥 CLIENTES
- Cadastrar com nome, telefone e email
- Editar, desativar, reativar ou excluir
- Consultar histórico, inativos, melhores clientes

👤 PROFISSIONAIS
- Cadastrar com nome, especialidade e telefone
- Editar, desativar, reativar ou excluir
- Ver profissional mais ocupado, agenda por profissional

✦ SERVIÇOS
- Cadastrar com nome, preço e duração em minutos
- Editar, desativar, reativar ou excluir
- Ver serviço mais popular/agendado

📊 RELATÓRIOS E FINANCEIRO
- Faturamento total, por mês, por período
- Estatísticas: agendamentos hoje, amanhã, pendentes, confirmados
- Clientes inativos, novos clientes por período
- Top clientes, top profissionais, top serviços

⚙️ CONFIGURAÇÕES
- Dados da empresa (nome, tipo, horário de funcionamento)
- Horários disponíveis para agendamento

COMANDOS QUE O USUÁRIO PODE USAR (exemplos):
"agendar Maria para amanhã às 14h"
"listar clientes", "cadastrar profissional"
"faturamento de junho", "agendamentos hoje"
"cancelar agendamento do João", "confirmar agendamento da Ana"
"horários livres para sexta", "clientes inativos"

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português brasileiro, de forma simpática e objetiva
- NUNCA invente dados reais do sistema (clientes, valores, datas)
- NUNCA mencione Groq, Llama, OpenAI ou qualquer tecnologia de IA
- Você se chama VyXora AI e só isso
- Para consultas de dados reais, oriente o usuário a usar os comandos
- Seja direto — respostas curtas são melhores que longas
- Use emojis com moderação para tornar as respostas mais amigáveis`;

  if (mode === 'polish') {
    return `${base}

MODO ATUAL: Formatação de resposta
Você vai receber uma mensagem de confirmação de ação do sistema (ex: "Agendamento criado para João em 10/06 às 14:00") e deve transformá-la em uma resposta mais amigável, humana e profissional.
- Mantenha as informações exatas (nomes, datas, horários)
- Adicione emojis relevantes
- Seja caloroso mas objetivo
- Máximo 3 linhas`;
  }

  if (mode === 'content') {
    return `${base}

MODO ATUAL: Geração de conteúdo profissional
Você vai gerar textos para publicação (redes sociais, WhatsApp, comunicados) para a empresa "${nome}".
- Adapte o tom ao tipo de negócio (${tipo})
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

// ─── 1. Fallback inteligente para perguntas livres ─────────────────────────────
export async function askGroq(context, message, history = []) {
  const recentHistory = (history || []).slice(-6).map(h => ({
    role:    h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content || ''
  }));

  const messages = [
    { role: 'system', content: buildSystemPrompt(context, 'assistant') },
    ...recentHistory,
    { role: 'user',   content: message }
  ];

  const reply = await callGroq(messages, { temperature: 0.7, maxTokens: 512 });
  return { type: 'chat', answer: reply };
}

// ─── 2. Formata/embeleza respostas brutas da API ───────────────────────────────
// Recebe: "Agendamento criado para João em 10/06 às 14:00."
// Retorna: "✅ Agendamento marcado! João está confirmado para 10/06 às 14h. Tudo certo no sistema! 📅"
export async function polishAnswer(context, rawAnswer, intentName = '') {
  const apiKey = process.env.GROQ_API_KEY;
  // Se não tiver chave, devolve a resposta original sem quebrar
  if (!apiKey) return rawAnswer;

  // Ações que valem a pena polir
  const worthPolishing = [
    'create_appointment', 'reschedule_appointment', 'cancel_appointment',
    'confirm_appointment', 'conclude_appointment',
    'create_client', 'create_professional', 'create_service',
    'update_client', 'update_professional', 'update_service',
    'disable_client', 'disable_professional', 'disable_service',
    'reactivate_client', 'reactivate_professional', 'reactivate_service',
    'delete_client', 'delete_professional', 'delete_service'
  ];

  if (intentName && !worthPolishing.includes(intentName)) return rawAnswer;

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(context, 'polish') },
      { role: 'user',   content: `Transforme esta mensagem do sistema em uma resposta amigável e profissional:\n\n"${rawAnswer}"` }
    ];

    const polished = await callGroq(messages, { temperature: 0.6, maxTokens: 200 });
    return polished;
  } catch {
    // Falha silenciosa — usa resposta original
    return rawAnswer;
  }
}

// ─── 3. Gera textos profissionais para publicação ─────────────────────────────
// Tipos suportados: post_instagram, post_whatsapp, comunicado, promocao, aviso, descricao_servico
export async function generateContent(context, request) {
  const { tipo = 'post_whatsapp', tema, detalhes = '', tom = 'profissional' } = request;

  const empresa = context?.company;
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
${detalhes ? `Detalhes adicionais: ${detalhes}` : ''}
Tom: ${tom}

Retorne apenas o texto final, sem explicações ou títulos.`;

  const messages = [
    { role: 'system', content: buildSystemPrompt(context, 'content') },
    { role: 'user',   content: prompt }
  ];

  const content = await callGroq(messages, { temperature: 0.8, maxTokens: 400 });
  return { type: 'content', answer: content };
}
