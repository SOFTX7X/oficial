import { OpenAI } from 'openai';
import { executeAction } from './actions.js';
import { executeQuery } from './queries.js';
import { getDashboardStats } from './statistics.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function interpretIntent(context, message, body = {}) {
  try {
    const systemPrompt = `
      Atuas como o motor de inteligência artificial de um sistema de agendamento premium chamado VyXora.
      O teu objetivo é analisar a mensagem do utilizador e mapeá-la para um dos três domínios principais:
      1. "dashboard" - Se o utilizador pede métricas, faturamento, contagens ou estatísticas gerais do painel.
      2. "query" - Se o utilizador quer listar horários livres, identificar o melhor cliente, profissional mais ocupado ou clientes inativos.
      3. "action" - Se o utilizador quer criar, atualizar, reagendar ou cancelar clientes, profissionais, serviços ou agendamentos.

      Deves responder estritamente com um objeto JSON válido no seguinte formato:
      {
        "domain": "dashboard" | "query" | "action",
        "name": "nome_da_funcao_especifica",
        "params": { ... }
      }

      Nomes de funções válidas:
      - Para dashboard: "get_stats"
      - Para query: "best_client", "top_professional", "top_service", "free_slots", "inactive_clients", "pending_appointments"
      - Para action: "create_client", "update_client", "create_professional", "update_professional", "create_service", "update_service", "create_appointment", "reschedule_appointment", "cancel_appointment"
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' }
    });

    const intent = JSON.parse(response.choices[0].message.content || '{}');

    // Mescla os parâmetros identificados pela IA com os dados forçados enviados pelo console (ex: data, hora)
    intent.params = { ...intent.params, ...body };

    // ── CORREÇÃO DO ERRO 'query.url.includes': Validação segura ──
    const query = context.req?.query || context.query || {};
    if (query && typeof query.url === 'string') {
      if (query.url.includes('api/ai')) {
        // Lógica interna de rota se necessário
      }
    }

    if (intent.domain === 'dashboard') {
      return await getDashboardStats(context, intent);
    }

    if (intent.domain === 'query') {
      return await executeQuery(context, intent);
    }

    if (intent.domain === 'action') {
      if (intent.name === 'create_appointment' && !intent.params.data) {
        return {
          success: true,
          intent,
          answer: 'Para quando deseja agendar um horário? Informe a data.',
          hint: 'Aguardando data',
          empresa: context.empresa
        };
      }
      return await executeAction(context, intent);
    }

    return { answer: 'Não consegui compreender a intenção. Poderia reformular?' };

  } catch (error) {
    console.error('Erro dentro do interpretador de intenções:', error);
    throw error;
  }
}
