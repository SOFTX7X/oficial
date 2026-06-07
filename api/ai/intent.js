import { executeAction } from './actions.js';
import { runQuery } from './queries.js';
import { getStatistics } from './statistics.js';

export async function interpretIntent(context, message, fullBody) {
  const text = message.toLowerCase();

  // 1. Identificação de Padrões para Painel / Estatísticas
  if (text.includes('painel') || text.includes('resumo') || text.includes('estatistica')) {
    const stats = await getStatistics(context);
    return { type: 'statistics', data: stats };
  }

  // 2. Identificação de Padrões para Relatórios / Consultas
  if (text.includes('melhor cliente') || text.includes('relatorio') || text.includes('faturamento')) {
    const queryResult = await runQuery(context, text);
    return { type: 'query', data: queryResult };
  }

  // 3. Padrão Padrão: Processamento de Agendamentos / Ações do CRUD
  const actionResult = await executeAction(context, message, fullBody);
  return { type: 'action', data: actionResult };
}
