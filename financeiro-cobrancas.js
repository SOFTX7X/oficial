(function () {
  'use strict';

  const TABLE = 'agenda_cobrancas';
  const LOCAL_PREFIX = 'vyxora_cobrancas_teste_';
  let modoLocal = false;
  let abaAtual = 'resumo';

  const $f = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);
  const moeda = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataBR = value => {
    if (!value) return '—';
    const raw = String(value).slice(0, 10);
    const parts = raw.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : raw;
  };
  const dataHoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const addDias = quantidade => {
    const d = new Date();
    d.setDate(d.getDate() + quantidade);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const gerarCodigo = prefixo => `${prefixo}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const gerarToken = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
  const empresaId = () => window.state?.empresa?.id || '';
  const storageKey = id => LOCAL_PREFIX + id;

  function lerLocal(id) {
    try { return JSON.parse(localStorage.getItem(storageKey(id)) || '[]'); }
    catch (_) { return []; }
  }

  function salvarLocal(id, registros) {
    localStorage.setItem(storageKey(id), JSON.stringify(registros));
  }

  function tabelaNaoExiste(error) {
    const texto = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    return texto.includes('42p01') || texto.includes('agenda_cobrancas') || texto.includes('schema cache');
  }

  async function loadCobrancasFinanceiras(id) {
    if (!id || !window.db) return [];
    const { data, error } = await window.db.from(TABLE).select('*').eq('empresa_id', id).order('criado_em', { ascending: false });
    if (!error) {
      modoLocal = false;
      return data || [];
    }
    if (tabelaNaoExiste(error)) {
      modoLocal = true;
      return lerLocal(id);
    }
    console.error('Erro ao carregar cobranças:', error);
    return [];
  }

  function statusReal(cobranca) {
    if (cobranca.status === 'pago' || cobranca.status === 'cancelado') return cobranca.status;
    if (cobranca.vencimento && cobranca.vencimento < dataHoje()) return 'vencido';
    return 'pendente';
  }

  function textoStatus(status) {
    return ({ pendente: 'Pendente', pago: 'Pagamento confirmado', vencido: 'Vencida', cancelado: 'Cancelada' })[status] || status;
  }

  function montarEstruturaFinanceira() {
    const view = $f('view-financeiro');
    if (!view || view.dataset.cobrancasV2 === '1') return;
    view.dataset.cobrancasV2 = '1';
    view.classList.add('vx-finance-view');
    view.innerHTML = `
      <header class="vx-fin-head">
        <div><span class="vx-fin-kicker">Pagamentos e recebidos</span><h1>Financeiro <em>sem complicação.</em></h1><p>Crie cobranças, confirme pagamentos e entregue recibos.</p></div>
        <button class="vx-charge-primary" type="button" onclick="abrirNovaCobranca()"><span>＋</span> Nova cobrança</button>
      </header>
      <div class="vx-fin-local-note" id="vxFinLocalNote" hidden><strong>Modo de teste local</strong><span>A estrutura visual está ativa. Execute o arquivo SQL incluído no projeto para compartilhar cobranças entre dispositivos.</span></div>
      <nav class="vx-fin-tabs" aria-label="Seções financeiras">
        <button class="active" data-fin-tab="resumo" onclick="mudarAbaFinanceiro('resumo')">Visão geral</button>
        <button data-fin-tab="cobrancas" onclick="mudarAbaFinanceiro('cobrancas')">Cobranças <span id="vxPendingBadge">0</span></button>
        <button data-fin-tab="recebidos" onclick="mudarAbaFinanceiro('recebidos')">Recebidos</button>
      </nav>
      <section class="vx-fin-pane active" data-fin-pane="resumo">
        <div class="vx-fin-metrics" id="vxFinMetrics"></div>
        <div class="vx-fin-split">
          <article class="vx-fin-panel"><div class="vx-panel-head"><div><span>Fluxo recente</span><strong>Últimas cobranças</strong></div><button onclick="mudarAbaFinanceiro('cobrancas')">Ver todas</button></div><div id="vxRecentCharges"></div></article>
          <article class="vx-fin-panel vx-received-panel"><div class="vx-panel-head"><div><span>Entradas confirmadas</span><strong>Recebidos recentemente</strong></div><button onclick="mudarAbaFinanceiro('recebidos')">Histórico</button></div><div id="vxRecentReceived"></div></article>
        </div>
      </section>
      <section class="vx-fin-pane" data-fin-pane="cobrancas">
        <div class="vx-list-toolbar"><div><strong>Cobranças criadas</strong><span>Pagamento, vencimento e ações em um só lugar.</span></div><select id="vxChargeFilter" onchange="renderFinanceiroV2()"><option value="todos">Todos os estados</option><option value="pendente">Pendentes</option><option value="vencido">Vencidas</option><option value="pago">Pagas</option><option value="cancelado">Canceladas</option></select></div>
        <div class="vx-charge-list" id="vxChargeList"></div>
      </section>
      <section class="vx-fin-pane" data-fin-pane="recebidos">
        <div class="vx-list-toolbar"><div><strong>Pagamentos confirmados</strong><span>Cada valor aparece uma única vez.</span></div></div>
        <div class="vx-charge-list" id="vxReceivedList"></div>
      </section>
      <button class="vx-mobile-new-charge" type="button" onclick="abrirNovaCobranca()"><span>＋</span> Nova cobrança</button>`;
    criarModalCobranca();
    criarVisualizadorDocumento();
  }

  function criarModalCobranca() {
    if ($f('vxChargeModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="vx-charge-overlay" id="vxChargeModal" aria-hidden="true">
        <section class="vx-charge-modal" role="dialog" aria-modal="true" aria-labelledby="vxChargeTitle">
          <div class="vx-charge-modal-head"><div><span>Nova cobrança</span><h2 id="vxChargeTitle">Dados do pagamento</h2></div><button type="button" onclick="fecharNovaCobranca()" aria-label="Fechar">×</button></div>
          <div class="vx-charge-progress"><i class="active"></i><i></i><i></i></div>
          <div class="vx-charge-form">
            <div class="vx-field vx-field-wide"><label>Usar um agendamento</label><select id="vxCobAgendamento" onchange="preencherCobrancaPorAgendamento()"><option value="">Cobrança sem agendamento</option></select></div>
            <div class="vx-field"><label>Cliente</label><input id="vxCobCliente" placeholder="Nome do cliente"></div>
            <div class="vx-field"><label>WhatsApp</label><input id="vxCobWhatsapp" placeholder="(00) 00000-0000"></div>
            <div class="vx-field"><label>Serviço</label><input id="vxCobServico" placeholder="Serviço realizado"></div>
            <div class="vx-field"><label>Profissional</label><input id="vxCobProfissional" placeholder="Quem realizou"></div>
            <div class="vx-field"><label>Valor</label><input id="vxCobValor" type="number" min="0" step="0.01" placeholder="0,00"></div>
            <div class="vx-field"><label>Vencimento</label><input id="vxCobVencimento" type="date"></div>
            <div class="vx-field vx-field-wide"><label>Chave PIX</label><input id="vxCobPixChave" placeholder="CPF, telefone, e-mail ou chave aleatória"></div>
            <div class="vx-field vx-field-wide"><label>PIX Copia e Cola <small>opcional</small></label><textarea id="vxCobPixCodigo" rows="3" placeholder="Cole o código PIX gerado pelo seu banco"></textarea></div>
            <div class="vx-field vx-field-wide"><label>Link de pagamento <small>opcional</small></label><input id="vxCobLinkPagamento" placeholder="https://..."></div>
          </div>
          <div class="vx-charge-modal-foot"><button class="vx-charge-secondary" onclick="fecharNovaCobranca()">Cancelar</button><button class="vx-charge-primary" id="vxSaveCharge" onclick="salvarNovaCobranca()">Criar cobrança</button></div>
        </section>
      </div>`);
  }

  function criarVisualizadorDocumento() {
    if ($f('vxDocumentModal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="vx-doc-overlay" id="vxDocumentModal" aria-hidden="true"><section class="vx-doc-shell"><header><div><span id="vxDocType">Cobrança</span><strong id="vxDocTitle">Documento</strong></div><button onclick="fecharDocumentoFinanceiro()">×</button></header><div class="vx-doc-body" id="vxDocBody"></div><footer><button class="vx-charge-secondary" onclick="copiarLinkCobrancaAtual()">Copiar link</button><button class="vx-charge-primary" onclick="imprimirDocumentoFinanceiro()">Salvar PDF</button></footer></section></div>`);
  }

  function abrirNovaCobranca() {
    montarEstruturaFinanceira();
    const select = $f('vxCobAgendamento');
    const cobrados = new Set((window.state?.cobrancas || []).filter(c => c.status !== 'cancelado' && c.agendamento_id).map(c => String(c.agendamento_id)));
    const agendamentos = (window.state?.agendamentos || []).filter(a => a.status !== 'Excluído' && !cobrados.has(String(a.id)));
    select.innerHTML = '<option value="">Cobrança sem agendamento</option>' + agendamentos.map(a => `<option value="${esc(a.id)}">${esc(a.cliente_nome)} · ${esc(a.servico_nome || 'Serviço')} · ${moeda(a.valor)}</option>`).join('');
    ['vxCobCliente','vxCobWhatsapp','vxCobServico','vxCobProfissional','vxCobValor','vxCobPixChave','vxCobPixCodigo','vxCobLinkPagamento'].forEach(id => { if ($f(id)) $f(id).value = ''; });
    $f('vxCobVencimento').value = addDias(2);
    $f('vxChargeModal').classList.add('open');
    $f('vxChargeModal').setAttribute('aria-hidden', 'false');
    window.VYXORA_SCROLL?.lock('charge-modal');
  }

  function fecharNovaCobranca() {
    $f('vxChargeModal')?.classList.remove('open');
    $f('vxChargeModal')?.setAttribute('aria-hidden', 'true');
    window.VYXORA_SCROLL?.unlock('charge-modal');
  }

  function preencherCobrancaPorAgendamento() {
    const id = $f('vxCobAgendamento')?.value;
    const a = (window.state?.agendamentos || []).find(item => String(item.id) === String(id));
    if (!a) return;
    $f('vxCobCliente').value = a.cliente_nome || '';
    $f('vxCobWhatsapp').value = a.cliente_telefone || a.telefone || '';
    $f('vxCobServico').value = a.servico_nome || '';
    $f('vxCobProfissional').value = a.profissional_nome || '';
    $f('vxCobValor').value = Number(a.valor || 0).toFixed(2);
  }

  async function salvarNovaCobranca() {
    const cliente = $f('vxCobCliente')?.value.trim();
    const servico = $f('vxCobServico')?.value.trim();
    const valor = Number($f('vxCobValor')?.value || 0);
    if (!cliente) return window.toast?.('Informe o cliente da cobrança.', 'err');
    if (!servico) return window.toast?.('Informe o serviço realizado.', 'err');
    if (!(valor > 0)) return window.toast?.('Informe um valor maior que zero.', 'err');
    const agendamentoId = $f('vxCobAgendamento')?.value || null;
    if (agendamentoId && (window.state?.cobrancas || []).some(c => String(c.agendamento_id) === String(agendamentoId) && c.status !== 'cancelado')) return window.toast?.('Este agendamento já possui uma cobrança ativa.', 'err');
    const registro = {
      empresa_id: empresaId(), agendamento_id: agendamentoId, codigo: gerarCodigo('COB'), public_token: gerarToken(),
      cliente_nome: cliente, cliente_whatsapp: $f('vxCobWhatsapp')?.value.trim() || '', servico_nome: servico,
      profissional_nome: $f('vxCobProfissional')?.value.trim() || '', valor, vencimento: $f('vxCobVencimento')?.value || addDias(2),
      status: 'pendente', forma_pagamento: 'pix', pix_chave: $f('vxCobPixChave')?.value.trim() || '',
      pix_copia_cola: $f('vxCobPixCodigo')?.value.trim() || '', link_pagamento: $f('vxCobLinkPagamento')?.value.trim() || '',
      criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString()
    };
    const btn = $f('vxSaveCharge');
    if (btn) { btn.disabled = true; btn.textContent = 'Criando...'; }
    try {
      if (modoLocal) {
        registro.id = gerarToken();
        const lista = [registro, ...lerLocal(empresaId())];
        salvarLocal(empresaId(), lista);
        window.state.cobrancas = lista;
      } else {
        const { data, error } = await window.db.from(TABLE).insert(registro).select('*').single();
        if (error) {
          if (!tabelaNaoExiste(error)) throw error;
          modoLocal = true; registro.id = gerarToken();
          const lista = [registro, ...lerLocal(empresaId())]; salvarLocal(empresaId(), lista); window.state.cobrancas = lista;
        } else window.state.cobrancas = [data, ...(window.state.cobrancas || [])];
      }
      fecharNovaCobranca();
      abaAtual = 'cobrancas';
      renderFinanceiroV2();
      window.showNotif?.('Cobrança criada', `${cliente} · ${moeda(valor)}`, 'ok', 4000);
    } catch (error) {
      console.error(error); window.toast?.('Não foi possível criar a cobrança.', 'err');
    } finally { if (btn) { btn.disabled = false; btn.textContent = 'Criar cobrança'; } }
  }

  async function confirmarPagamentoCobranca(id) {
    const c = (window.state?.cobrancas || []).find(item => String(item.id) === String(id));
    if (!c || c.status === 'pago') return window.toast?.('Este pagamento já foi confirmado.', 'warn');
    window.openConfirmModal?.({ icon: '✓', type: 'info', title: 'Confirmar pagamento?', body: `${c.cliente_nome} · ${moeda(c.valor)}. O valor entrará em Recebidos e o recibo será liberado.`, btnLabel: 'Confirmar pagamento', cb: async () => {
      const alteracoes = { status: 'pago', pago_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), recibo_codigo: c.recibo_codigo || gerarCodigo('REC') };
      try {
        if (modoLocal) {
          const lista = lerLocal(empresaId()).map(item => String(item.id) === String(id) && item.status !== 'pago' ? { ...item, ...alteracoes } : item);
          salvarLocal(empresaId(), lista); window.state.cobrancas = lista;
        } else {
          const { data, error } = await window.db.from(TABLE).update(alteracoes).eq('id', id).eq('status', 'pendente').select('*').maybeSingle();
          if (error) throw error;
          if (!data) return window.toast?.('O pagamento já foi confirmado ou a cobrança mudou.', 'warn');
          Object.assign(c, data);
        }
        renderFinanceiroV2(); window.showNotif?.('Pagamento confirmado!', `${c.cliente_nome} entrou em Recebidos.`, 'ok', 5000);
      } catch (error) { console.error(error); window.toast?.('Não foi possível confirmar o pagamento.', 'err'); }
    }});
  }

  async function cancelarCobranca(id) {
    const c = (window.state?.cobrancas || []).find(item => String(item.id) === String(id));
    if (!c || c.status === 'pago') return window.toast?.('Uma cobrança paga não pode ser cancelada.', 'warn');
    window.openConfirmModal?.({ icon: '×', type: 'danger', title: 'Cancelar cobrança?', body: `A cobrança ${c.codigo} deixará de aceitar confirmação.`, btnLabel: 'Cancelar cobrança', cb: async () => {
      const alteracoes = { status: 'cancelado', cancelado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
      if (modoLocal) {
        const lista = lerLocal(empresaId()).map(item => String(item.id) === String(id) ? { ...item, ...alteracoes } : item); salvarLocal(empresaId(), lista); window.state.cobrancas = lista;
      } else {
        const { data, error } = await window.db.from(TABLE).update(alteracoes).eq('id', id).neq('status', 'pago').select('*').maybeSingle();
        if (error) return window.toast?.('Não foi possível cancelar.', 'err');
        if (data) Object.assign(c, data);
      }
      renderFinanceiroV2(); window.showNotif?.('Cobrança cancelada', c.codigo, 'info');
    }});
  }

  function linkPublico(c) { return `${location.origin}${location.pathname}#cobranca/${c.public_token}`; }
  let documentoAtual = null;

  function abrirDocumentoFinanceiro(id, tipo) {
    const c = (window.state?.cobrancas || []).find(item => String(item.id) === String(id));
    if (!c) return;
    if (tipo === 'recibo' && c.status !== 'pago') return window.toast?.('O recibo só é liberado após o pagamento.', 'warn');
    documentoAtual = { cobranca: c, tipo };
    $f('vxDocType').textContent = tipo === 'recibo' ? 'Recibo digital' : 'Cobrança digital';
    $f('vxDocTitle').textContent = tipo === 'recibo' ? c.recibo_codigo : c.codigo;
    $f('vxDocBody').innerHTML = documentoHTML(c, tipo, true);
    gerarQrNoDocumento(c);
    $f('vxDocumentModal').classList.add('open'); $f('vxDocumentModal').setAttribute('aria-hidden', 'false'); window.VYXORA_SCROLL?.lock('finance-doc');
  }

  function fecharDocumentoFinanceiro() { $f('vxDocumentModal')?.classList.remove('open'); $f('vxDocumentModal')?.setAttribute('aria-hidden', 'true'); window.VYXORA_SCROLL?.unlock('finance-doc'); }
  function copiarTexto(texto, mensagem) { navigator.clipboard?.writeText(texto).then(() => window.toast?.(mensagem, 'ok')).catch(() => window.toast?.('Não foi possível copiar.', 'err')); }
  function copiarLinkCobrancaAtual() { if (documentoAtual) copiarTexto(linkPublico(documentoAtual.cobranca), 'Link da cobrança copiado.'); }

  function documentoHTML(c, tipo, modal) {
    const recibo = tipo === 'recibo';
    const empresa = window.state?.empresa || {};
    return `<article class="vx-document ${recibo ? 'receipt' : ''}">
      <div class="vx-document-top"><div><span>VYXORA</span><strong>${recibo ? 'RECIBO DE PAGAMENTO' : 'COBRANÇA DIGITAL'}</strong></div><b>${esc(recibo ? c.recibo_codigo : c.codigo)}</b></div>
      <div class="vx-document-banner"><span>${recibo ? '✓' : '◈'}</span><div><strong>${recibo ? 'Pagamento confirmado' : textoStatus(statusReal(c))}</strong><small>${recibo ? `Recebido em ${dataBR(c.pago_em)}` : `Vencimento em ${dataBR(c.vencimento)}`}</small></div></div>
      <div class="vx-document-grid"><section><h3>Dados</h3><dl><dt>Empresa</dt><dd>${esc(empresa.nome || 'Estabelecimento')}</dd><dt>Profissional</dt><dd>${esc(c.profissional_nome || '—')}</dd><dt>Cliente</dt><dd>${esc(c.cliente_nome)}</dd><dt>WhatsApp</dt><dd>${esc(c.cliente_whatsapp || '—')}</dd></dl></section><section class="vx-document-value"><h3>Valor ${recibo ? 'recebido' : 'total'}</h3><strong>${moeda(c.valor)}</strong><small>${esc(c.servico_nome)}</small></section></div>
      <section class="vx-document-service"><h3>Detalhes do serviço</h3><div><span>${esc(c.servico_nome)}</span><b>${moeda(c.valor)}</b></div></section>
      ${recibo ? `<section class="vx-document-proof"><span>Forma de pagamento</span><strong>PIX</strong><small>Este documento confirma a quitação da cobrança ${esc(c.codigo)}.</small></section>` : `<div class="vx-document-pay"><section><h3>Pagamento via PIX</h3><span>Chave PIX</span><strong>${esc(c.pix_chave || 'Não informada')}</strong><span>PIX Copia e Cola</span><small>${esc(c.pix_copia_cola || 'Não informado')}</small>${c.link_pagamento ? `<a href="${esc(c.link_pagamento)}" target="_blank" rel="noopener">Abrir link de pagamento</a>` : ''}</section><section class="vx-document-qr"><div id="vxDocumentQr"></div><small>Escaneie para pagar</small></section></div>`}
      <footer>Documento gerado pela VYXORA · ${dataBR(recibo ? c.pago_em : c.criado_em)}</footer></article>`;
  }

  function gerarQrNoDocumento(c) {
    const target = $f('vxDocumentQr');
    if (!target || !window.QRCode) return;
    target.innerHTML = '';
    new window.QRCode(target, { text: c.pix_copia_cola || c.link_pagamento || linkPublico(c), width: 132, height: 132, colorDark: '#07030D', colorLight: '#ffffff' });
  }

  function imprimirDocumentoFinanceiro() {
    if (!documentoAtual) return;
    const { cobranca, tipo } = documentoAtual;
    const popup = window.open('', '_blank', 'width=920,height=1000');
    if (!popup) return window.toast?.('Permita a abertura da janela para salvar o PDF.', 'warn');
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(tipo === 'recibo' ? cobranca.recibo_codigo : cobranca.codigo)}</title><link rel="stylesheet" href="${location.origin}${location.pathname.replace(/[^/]*$/, '')}financeiro-cobrancas.css?v=20260810-1"><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script></head><body class="vx-print-page">${documentoHTML(cobranca, tipo, false)}<script>window.onload=function(){var t=document.getElementById('vxDocumentQr');if(t&&window.QRCode)new QRCode(t,{text:${JSON.stringify(cobranca.pix_copia_cola || cobranca.link_pagamento || linkPublico(cobranca))},width:132,height:132,colorDark:'#07030D',colorLight:'#ffffff'});setTimeout(function(){window.print()},350)}<\/script></body></html>`);
    popup.document.close();
  }

  function acoesCobranca(c) {
    const status = statusReal(c);
    if (status === 'pago') return `<button class="vx-action primary" onclick="abrirDocumentoFinanceiro('${esc(c.id)}','recibo')">Ver recibo</button><button class="vx-action" onclick="abrirDocumentoFinanceiro('${esc(c.id)}','cobranca')">Cobrança</button>`;
    if (status === 'cancelado') return `<button class="vx-action" onclick="abrirDocumentoFinanceiro('${esc(c.id)}','cobranca')">Visualizar</button>`;
    return `<button class="vx-action primary" onclick="confirmarPagamentoCobranca('${esc(c.id)}')">Confirmar pagamento</button><button class="vx-action" onclick="abrirDocumentoFinanceiro('${esc(c.id)}','cobranca')">Ver cobrança</button><button class="vx-action icon" onclick="compartilharCobranca('${esc(c.id)}')" aria-label="Compartilhar">↗</button><button class="vx-action icon danger" onclick="cancelarCobranca('${esc(c.id)}')" aria-label="Cancelar">×</button>`;
  }

  function cardCobranca(c) {
    const status = statusReal(c);
    return `<article class="vx-charge-card ${status}"><div class="vx-charge-main"><div class="vx-charge-avatar">${esc((c.cliente_nome || '?').slice(0,1).toUpperCase())}</div><div class="vx-charge-person"><strong>${esc(c.cliente_nome)}</strong><span>${esc(c.servico_nome)} · ${esc(c.codigo)}</span></div><div class="vx-charge-amount"><strong>${moeda(c.valor)}</strong><span>Vence ${dataBR(c.vencimento)}</span></div><span class="vx-status ${status}">${textoStatus(status)}</span></div><div class="vx-charge-actions">${acoesCobranca(c)}</div></article>`;
  }

  function vazioFinanceiro(titulo, texto) { return `<div class="vx-fin-empty"><span>◇</span><strong>${titulo}</strong><p>${texto}</p></div>`; }

  function renderFinanceiroV2() {
    montarEstruturaFinanceira();
    const lista = [...(window.state?.cobrancas || [])].sort((a,b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
    const pagas = lista.filter(c => c.status === 'pago');
    const pendentes = lista.filter(c => ['pendente','vencido'].includes(statusReal(c)));
    const recebidosTotal = pagas.reduce((s,c) => s + Number(c.valor || 0), 0);
    const pendenteTotal = pendentes.reduce((s,c) => s + Number(c.valor || 0), 0);
    const mes = dataHoje().slice(0,7);
    const recebidoMes = pagas.filter(c => String(c.pago_em || '').slice(0,7) === mes).reduce((s,c) => s + Number(c.valor || 0), 0);
    $f('vxFinLocalNote').hidden = !modoLocal;
    $f('vxPendingBadge').textContent = pendentes.length;
    $f('vxFinMetrics').innerHTML = `<article><span>Recebidos</span><strong>${moeda(recebidosTotal)}</strong><small>${pagas.length} pagamento${pagas.length === 1 ? '' : 's'} confirmado${pagas.length === 1 ? '' : 's'}</small></article><article><span>A receber</span><strong>${moeda(pendenteTotal)}</strong><small>${pendentes.length} cobrança${pendentes.length === 1 ? '' : 's'} em aberto</small></article><article><span>Recebido no mês</span><strong>${moeda(recebidoMes)}</strong><small>${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</small></article><article><span>Total de cobranças</span><strong>${lista.length}</strong><small>Histórico completo</small></article>`;
    $f('vxRecentCharges').innerHTML = lista.length ? lista.slice(0,4).map(cardCobranca).join('') : vazioFinanceiro('Nenhuma cobrança criada', 'Crie a primeira cobrança para começar.');
    $f('vxRecentReceived').innerHTML = pagas.length ? pagas.slice(0,4).map(cardCobranca).join('') : vazioFinanceiro('Nenhum pagamento confirmado', 'Os valores pagos aparecerão aqui.');
    const filtro = $f('vxChargeFilter')?.value || 'todos';
    const filtradas = filtro === 'todos' ? lista : lista.filter(c => statusReal(c) === filtro);
    $f('vxChargeList').innerHTML = filtradas.length ? filtradas.map(cardCobranca).join('') : vazioFinanceiro('Nada por aqui', 'Nenhuma cobrança corresponde a este filtro.');
    $f('vxReceivedList').innerHTML = pagas.length ? pagas.map(cardCobranca).join('') : vazioFinanceiro('Nenhum recebido', 'Confirme um pagamento para liberar o recibo.');
    mudarAbaFinanceiro(abaAtual, false);
  }

  function mudarAbaFinanceiro(aba, renderizar = true) {
    abaAtual = aba;
    document.querySelectorAll('[data-fin-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.finTab === aba));
    document.querySelectorAll('[data-fin-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.finPane === aba));
    if (renderizar) renderFinanceiroV2();
  }

  function compartilharCobranca(id) {
    const c = (window.state?.cobrancas || []).find(item => String(item.id) === String(id)); if (!c) return;
    const texto = `Olá, ${c.cliente_nome}! Sua cobrança de ${moeda(c.valor)} por ${c.servico_nome} está disponível: ${linkPublico(c)}`;
    const tel = String(c.cliente_whatsapp || '').replace(/\D/g,'');
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  function isPublicChargeRoute() { return location.hash.startsWith('#cobranca/'); }
  async function loadPublicChargeRoute() {
    const token = location.hash.replace('#cobranca/','').trim();
    document.querySelectorAll('#landingView,#dashboardView,#publicView').forEach(el => { if (el) el.style.display = 'none'; });
    let view = $f('chargePublicView');
    if (!view) { view = document.createElement('section'); view.id = 'chargePublicView'; document.body.appendChild(view); }
    view.style.display = 'block'; view.innerHTML = '<div class="vx-public-loading">Carregando cobrança...</div>';
    const { data: rows, error } = await window.db.rpc('buscar_cobranca_publica', { token_busca: token });
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (error || !data) { view.innerHTML = `<div class="vx-public-not-found"><span>◇</span><h1>Cobrança não encontrada</h1><p>Confira se o link recebido está correto.</p></div>`; return; }
    window.state = window.state || {}; window.state.empresa = { nome: data.empresa_nome || 'Estabelecimento' };
    view.innerHTML = `<div class="vx-public-charge"><div class="vx-public-brand">VYXORA <span>Pagamento seguro</span></div>${documentoHTML(data,'cobranca',false)}<div class="vx-public-actions">${data.pix_copia_cola ? `<button onclick="navigator.clipboard.writeText(${JSON.stringify(data.pix_copia_cola)});this.textContent='PIX copiado ✓'">Copiar PIX</button>` : ''}${data.link_pagamento ? `<a href="${esc(data.link_pagamento)}" target="_blank" rel="noopener">Abrir pagamento</a>` : ''}</div></div>`;
    const qr = $f('vxDocumentQr'); if (qr && window.QRCode) new window.QRCode(qr,{text:data.pix_copia_cola || data.link_pagamento || location.href,width:132,height:132,colorDark:'#07030D',colorLight:'#fff'});
  }

  window.loadCobrancasFinanceiras = loadCobrancasFinanceiras;
  window.renderFinanceiroV2 = renderFinanceiroV2;
  window.abrirNovaCobranca = abrirNovaCobranca;
  window.fecharNovaCobranca = fecharNovaCobranca;
  window.preencherCobrancaPorAgendamento = preencherCobrancaPorAgendamento;
  window.salvarNovaCobranca = salvarNovaCobranca;
  window.confirmarPagamentoCobranca = confirmarPagamentoCobranca;
  window.cancelarCobranca = cancelarCobranca;
  window.abrirDocumentoFinanceiro = abrirDocumentoFinanceiro;
  window.fecharDocumentoFinanceiro = fecharDocumentoFinanceiro;
  window.copiarLinkCobrancaAtual = copiarLinkCobrancaAtual;
  window.imprimirDocumentoFinanceiro = imprimirDocumentoFinanceiro;
  window.mudarAbaFinanceiro = mudarAbaFinanceiro;
  window.compartilharCobranca = compartilharCobranca;
  window.isPublicChargeRoute = isPublicChargeRoute;
  window.loadPublicChargeRoute = loadPublicChargeRoute;

  document.addEventListener('DOMContentLoaded', () => {
    montarEstruturaFinanceira();
    $f('vxChargeModal')?.addEventListener('click', event => { if (event.target.id === 'vxChargeModal') fecharNovaCobranca(); });
    $f('vxDocumentModal')?.addEventListener('click', event => { if (event.target.id === 'vxDocumentModal') fecharDocumentoFinanceiro(); });
  });
})();
