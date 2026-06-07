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

  // 3. Processamento de Ações estruturado como o objeto esperado pelo actions.js
  // Se o seu fluxo principal usa um objeto de intenção gerado previamente ou vindo do fullBody, 
  // nós o repassamos aqui; caso contrário, simulamos a estrutura necessária para o handler.
  const intentObj = fullBody?.intent || { 
    name: fullBody?.action || 'create_appointment', 
    params: { text: message, ...fullBody } 
  };

  const actionResult = await executeAction(context, intentObj);
  return { type: 'action', data: actionResult };
}
