function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
}

// Endpoint antigo desativado: revelar se um e-mail está cadastrado permite
// enumeração de contas. A verificação de duplicidade permanece exclusivamente
// dentro da rota de cadastro, sem uma consulta pública separada.
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  return sendJson(res, 410, { error: 'Verificação pública de e-mail desativada.' });
}
