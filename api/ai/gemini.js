// ─── Gemini Flash — Formatador de Respostas ───────────────────────────────────
// Usa o Gemini 2.0 Flash (nível gratuito) para transformar respostas brutas
// da IA em texto natural, amigável e bem formatado em português.

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Você é a VyXora, uma assistente virtual inteligente e simpática de um sistema de agendamentos para profissionais de beleza e estética.

Sua função é receber dados brutos ou respostas técnicas de uma API e transformá-las em mensagens naturais, amigáveis e bem formatadas em português brasileiro.

Regras:
- Seja concisa e direta, mas sempre cordial
- Use emojis com moderação para deixar a mensagem mais humana
- Formate datas no padrão brasileiro (dd/mm/aaaa)
- Formate horários como "14h30" ou "às 14h"
- Quando listar múltiplos itens, use quebras de linha
- Nunca exponha dados técnicos como IDs, UUIDs ou campos internos
- Se a ação foi bem-sucedida, confirme de forma positiva
- Se houve erro, explique de forma simples e sugira o que fazer
- Mantenha respostas curtas (máximo 3-4 linhas para ações simples)`;

/**
 * Formata uma resposta bruta usando o Gemini Flash (grátis).
 * @param {string} rawAnswer - Resposta bruta da API/ações
 * @param {object} data - Dados adicionais retornados pela ação (opcional)
 * @param {string} type - Tipo da resposta: 'action', 'query', 'statistics', 'error', 'slot_filling'
 * @returns {Promise<string>} - Resposta formatada em linguagem natural
 */
export async function formatWithGemini(rawAnswer, data = null, type = 'query') {
  // Se não tiver API Key configurada, retorna a resposta bruta
  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] GEMINI_API_KEY não configurada. Retornando resposta bruta.');
    return rawAnswer;
  }

  // Slot filling não precisa de formatação (já são perguntas simples)
  if (type === 'slot_filling') {
    return rawAnswer;
  }

  try {
    const userContent = buildUserContent(rawAnswer, data, type);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userContent }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
          topP: 0.9
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[Gemini] Erro na API:', err);
      return rawAnswer; // fallback para resposta bruta
    }

    const result = await response.json();
    const formatted = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    return formatted?.trim() || rawAnswer;

  } catch (error) {
    console.error('[Gemini] Falha ao formatar resposta:', error.message);
    return rawAnswer; // fallback seguro
  }
}

/**
 * Monta o conteúdo que será enviado ao Gemini para formatação.
 */
function buildUserContent(rawAnswer, data, type) {
  let content = `Formate a seguinte resposta de forma natural e amigável:\n\n`;
  content += `Resposta bruta: "${rawAnswer}"\n`;

  if (data) {
    if (type === 'statistics' || type === 'query') {
      content += `\nDados retornados: ${JSON.stringify(data, null, 2)}\n`;
      content += `\nFormate esses dados de forma legível para o usuário.`;
    } else if (type === 'action') {
      content += `\nAção executada com sucesso. Confirme de forma positiva.`;
    }
  }

  if (type === 'error') {
    content += `\nIsso é uma mensagem de erro. Explique de forma simples e sugira o que fazer.`;
  }

  return content;
}
