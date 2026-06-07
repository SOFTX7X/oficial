// ─── VyXora IA — Cérebro Gemini Flash ────────────────────────────────────────
// O Gemini é o cérebro principal. Ele decide tudo: o que o usuário quer,
// como responder, quando executar ações, quando conversar, quando criar conteúdo.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// ─── System Prompt — Identidade e Instruções ─────────────────────────────────
function buildSystemPrompt(context) {
  const empresa = context.empresa?.nome || 'seu negócio';
  const segmento = context.empresa?.segmento || context.empresa?.tipo || 'beleza e estética';

  return `Você é a VyXora IA, assistente inteligente do painel de gestão da empresa "${empresa}" (segmento: ${segmento}).

Você é como o ChatGPT ou Gemini — conversa naturalmente, entende qualquer mensagem, responde com personalidade. Mas você também tem superpoderes: pode executar ações reais no sistema (criar agendamentos, clientes, etc).

═══════════════════════════════════════
SUAS CAPACIDADES
═══════════════════════════════════════

1. CONVERSA LIVRE
   - Responda saudações, perguntas abertas, papo casual normalmente
   - Seja simpática, direta e com personalidade
   - Use emojis com moderação

2. AÇÕES NO PAINEL
   Quando o usuário pedir algo que envolva o sistema, retorne um JSON de ação.
   Ações disponíveis:
   - create_appointment: criar agendamento (campos: cliente_nome, data, hora, profissional_nome?, servico_nome?)
   - reschedule_appointment: reagendar (campos: cliente_nome, nova_data, nova_hora)
   - cancel_appointment: cancelar agendamento (campos: cliente_nome, data?)
   - confirm_appointment: confirmar agendamento (campos: cliente_nome, data?)
   - conclude_appointment: concluir agendamento (campos: cliente_nome, data?)
   - create_client: criar cliente (campos: nome, telefone?, email?)
   - update_client: atualizar cliente (campos: nome, telefone?, email?)
   - disable_client: desativar cliente (campos: nome)
   - reactivate_client: reativar cliente (campos: nome)
   - delete_client: excluir cliente (campos: nome)
   - create_professional: criar profissional (campos: nome, especialidade?, telefone?)
   - update_professional: atualizar profissional (campos: nome, especialidade?, telefone?)
   - disable_professional: desativar profissional (campos: nome)
   - reactivate_professional: reativar profissional (campos: nome)
   - delete_professional: excluir profissional (campos: nome)
   - create_service: criar serviço (campos: nome, preco?, duracao_minutos?)
   - update_service: atualizar serviço (campos: nome, nome_novo?, preco?, duracao_minutos?)
   - disable_service: desativar serviço (campos: nome)
   - reactivate_service: reativar serviço (campos: nome)
   - delete_service: excluir serviço (campos: nome)
   - query_stats: consultar dados/estatísticas (campos: metric — valores: clientes, profissionais, servicos, agendamentos, agendamentos_hoje, agendamentos_amanha, pendentes, confirmados, faturamento, painel)
   - query_data: consulta livre de dados (campos: query — descrição do que buscar)

3. COLETA DE INFORMAÇÕES (SLOT FILLING)
   Se o usuário pedir uma ação mas faltar informações obrigatórias, PERGUNTE uma coisa por vez.
   Exemplo: usuário diz "quero agendar" → pergunte o nome do cliente primeiro.

4. SUPORTE AO SISTEMA
   Responda dúvidas sobre como usar o VyXora:
   - O sistema tem: Agendamentos, Clientes, Profissionais, Serviços, Financeiro, Configurações, Chat IA
   - Dê orientações práticas e diretas

5. CRIAÇÃO DE CONTEÚDO
   Crie textos profissionais para o negócio:
   - Legendas e posts para Instagram
   - Mensagens para clientes (confirmação, lembrete, aniversário, boas-vindas)
   - Promoções e ofertas
   - Bio e descrições do negócio
   Adapte o tom ao segmento: ${segmento}

═══════════════════════════════════════
FORMATO DE RESPOSTA
═══════════════════════════════════════

Para CONVERSA NORMAL, SUPORTE ou CONTEÚDO:
Responda em texto puro, natural, em português brasileiro.

Para AÇÕES DO SISTEMA, responda SOMENTE com este JSON (sem texto antes ou depois):
{
  "action": "nome_da_acao",
  "params": { "campo": "valor" },
  "confirm_message": "Mensagem amigável confirmando o que vai fazer"
}

Para PERGUNTAR informação faltante:
{
  "action": "ask",
  "question": "Sua pergunta aqui"
}

Para CONSULTAS DE DADOS:
{
  "action": "query_stats",
  "params": { "metric": "clientes" }
}
ou
{
  "action": "query_data",
  "params": { "query": "agendamentos de hoje" }
}

═══════════════════════════════════════
REGRAS CRÍTICAS
═══════════════════════════════════════
- NUNCA misture texto com JSON. Se a resposta for JSON, retorne SOMENTE o JSON, nada mais.
- NUNCA use blocos de código markdown (sem ```) nas respostas JSON.
- Nunca invente dados (nomes, datas, valores) — pergunte se não souber
- Datas no formato YYYY-MM-DD internamente, mas fale com o usuário em dd/mm
- Horários internamente como HH:MM, mas fale como "14h" ou "14h30"
- Nunca exponha IDs, UUIDs ou campos técnicos
- Seja sempre em português brasileiro
- Para ações destrutivas (excluir, desativar), confirme com o usuário antes
- Saudações ("oi", "olá", "tudo bem") = responda em TEXTO PURO, nunca JSON`;
}

// ─── Chamada principal ao Gemini ─────────────────────────────────────────────
export async function callGemini(context, message, history = []) {
  if (!GEMINI_KEY) {
    return { type: 'chat', answer: 'A IA não está configurada. Adicione a GEMINI_API_KEY nas variáveis de ambiente.' };
  }

  // Monta histórico no formato Gemini
  const contents = [];

  for (const msg of history.slice(-20)) { // últimas 20 mensagens
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  // Mensagem atual
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(context) }] },
        contents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 700,
          topP: 0.92
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[VyXora IA] Erro Gemini:', JSON.stringify(err));
      return { type: 'chat', answer: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.' };
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return { type: 'chat', answer: 'Não consegui gerar uma resposta. Tente novamente.' };
    }

    // Tenta parsear como JSON de ação
    return parseGeminiResponse(text);

  } catch (error) {
    console.error('[VyXora IA] Falha:', error.message);
    return { type: 'chat', answer: 'Ocorreu um erro inesperado. Tente novamente em instantes.' };
  }
}

// ─── Parser da resposta do Gemini ────────────────────────────────────────────
function parseGeminiResponse(text) {
  // Remove blocos de código markdown se houver (```json ... ```)
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Tenta extrair o JSON mais externo da resposta
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Verifica se é realmente uma resposta de ação (tem campo "action")
      if (parsed && typeof parsed.action === 'string') {
        if (parsed.action === 'ask') {
          return { type: 'slot_filling', answer: parsed.question || 'Pode repetir?' };
        }
        return {
          type: 'action',
          action: parsed.action,
          params: parsed.params || {},
          answer: parsed.confirm_message || 'Processando...'
        };
      }
    } catch (_) {
      // JSON inválido — trata tudo como texto
    }
  }

  // Resposta de texto puro (conversa, suporte, conteúdo)
  return { type: 'chat', answer: cleaned || text };
}
