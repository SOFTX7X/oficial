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

  const semAcentos = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const campoPix = nome => String(window.state?.empresa?.[nome] || '').trim();
  const pixConfigurado = () => Boolean(campoPix('pix_chave') && campoPix('pix_nome_recebedor') && campoPix('pix_cidade'));
  const tlvPix = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

  function normalizarChavePix(tipo, valor) {
    const texto = String(valor || '').trim();
    if (tipo === 'cpf' || tipo === 'cnpj') return texto.replace(/\D/g, '');
    if (tipo === 'email') return texto.toLowerCase();
    if (tipo === 'telefone') {
      const digitos = texto.replace(/\D/g, '');
      return `+${digitos.startsWith('55') ? digitos : `55${digitos}`}`;
    }
    return texto;
  }

  function crc16Pix(texto) {
    let crc = 0xFFFF;
    for (let i = 0; i < texto.length; i += 1) {
      crc ^= texto.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function gerarPixCopiaCola(valor, codigo) {
    const chave = campoPix('pix_chave');
    const nome = semAcentos(campoPix('pix_nome_recebedor')).replace(/[^A-Z0-9 ]/g, '').slice(0, 25) || 'RECEBEDOR';
    const cidade = semAcentos(campoPix('pix_cidade')).replace(/[^A-Z0-9 ]/g, '').slice(0, 15) || 'BRASIL';
    const txid = semAcentos(codigo).replace(/[^A-Z0-9]/g, '').slice(0, 25) || '***';
    const conta = tlvPix('00', 'BR.GOV.BCB.PIX') + tlvPix('01', chave);
    const adicionais = tlvPix('05', txid);
    const base = tlvPix('00', '01') + tlvPix('26', conta) + tlvPix('52', '0000') + tlvPix('53', '986') +
      tlvPix('54', Number(valor).toFixed(2)) + tlvPix('58', 'BR') + tlvPix('59', nome) + tlvPix('60', cidade) + tlvPix('62', adicionais) + '6304';
    return base + crc16Pix(base);
  }

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
      <div class="vx-fin-toolbar">
        <nav class="vx-fin-tabs" id="vxFinTabs" aria-label="Seções financeiras">
          <span class="vx-fin-tab-indicator" id="vxFinTabIndicator"></span>
          <button class="active" data-fin-tab="resumo" onclick="mudarAbaFinanceiro('resumo')">Visão geral</button>
          <button data-fin-tab="cobrancas" onclick="mudarAbaFinanceiro('cobrancas')">Cobranças <span id="vxPendingBadge">0</span></button>
          <button data-fin-tab="recebidos" onclick="mudarAbaFinanceiro('recebidos')">Recebidos</button>
        </nav>
        <div class="vx-fin-head-actions">
          <button class="vx-charge-secondary" type="button" onclick="abrirConfiguracaoPix()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>Configurar PIX</button>
          <button class="vx-charge-primary" type="button" onclick="abrirNovaCobranca()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Nova cobrança</button>
        </div>
      </div>
      <section class="vx-fin-pane active" data-fin-pane="resumo">
        <div class="vx-fin-metrics" id="vxFinMetrics"></div>
        <div class="vx-fin-split">
          <article class="vx-fin-panel"><div class="vx-panel-head"><div><span>Fluxo recente</span><strong>Últimas cobranças</strong></div><button onclick="mudarAbaFinanceiro('cobrancas')">Ver todas</button></div><div id="vxRecentCharges"></div></article>
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
    criarModalConfiguracaoPix();
    criarVisualizadorDocumento();
  }

  function criarModalCobranca() {
    if ($f('vxChargeModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="vx-charge-overlay" id="vxChargeModal" aria-hidden="true">
        <section class="vx-charge-modal vx-charge-modal-premium" role="dialog" aria-modal="true" aria-labelledby="vxChargeTitle">
          <div class="vx-charge-modal-head"><div><span>Nova cobrança</span><h2 id="vxChargeTitle">Dados do pagamento</h2></div><button type="button" onclick="fecharNovaCobranca()" aria-label="Fechar">×</button></div>
          <div class="vx-charge-progress"><i class="active"></i><i></i><i></i></div>
          <div class="vx-charge-body-split">
            <div class="vx-charge-form">
              <div class="vx-field vx-field-wide"><label>Usar um agendamento</label><select id="vxCobAgendamento" onchange="preencherCobrancaPorAgendamento()"><option value="">Cobrança sem agendamento</option></select></div>
              <div class="vx-field"><label>Cliente</label><input id="vxCobCliente" placeholder="Nome do cliente" oninput="atualizarPreviewCobranca()"></div>
              <div class="vx-field"><label>WhatsApp</label><input id="vxCobWhatsapp" placeholder="(00) 00000-0000"></div>
              <div class="vx-field"><label>Serviço</label><input id="vxCobServico" placeholder="Serviço realizado" oninput="atualizarPreviewCobranca()"></div>
              <div class="vx-field"><label>Profissional</label><input id="vxCobProfissional" placeholder="Quem realizou"></div>
              <div class="vx-field"><label>Valor</label><input id="vxCobValor" type="number" min="0" step="0.01" placeholder="0,00" oninput="atualizarPreviewCobranca()"></div>
              <div class="vx-field"><label>Vencimento</label><input id="vxCobVencimento" type="date" oninput="atualizarPreviewCobranca()"></div>
            </div>
            <aside class="vx-charge-preview">
              <div class="vx-charge-preview-label">Pré-visualização</div>
              <div class="vx-charge-preview-card">
                <div class="vx-cpv-top">
                  <div class="vx-cpv-avatar" id="vxPrevAvatar">?</div>
                  <div class="vx-cpv-who">
                    <div class="vx-cpv-name" id="vxPrevNome">Nome do cliente</div>
                    <div class="vx-cpv-servico" id="vxPrevServico">Serviço</div>
                  </div>
                </div>
                <div class="vx-cpv-valor" id="vxPrevValor">R$ 0,00</div>
                <div class="vx-cpv-meta"><span>Vencimento</span><strong id="vxPrevVencimento">—</strong></div>
                <div class="vx-cpv-status">Pendente</div>
              </div>
              <p class="vx-charge-preview-hint">É assim que o cliente vai ver a cobrança ao abrir o link de pagamento.</p>
            </aside>
          </div>
          <div class="vx-charge-modal-foot"><button class="vx-charge-secondary" onclick="fecharNovaCobranca()">Cancelar</button><button class="vx-charge-primary" id="vxSaveCharge" onclick="salvarNovaCobranca()">Criar cobrança</button></div>
        </section>
      </div>`);
  }

  function criarModalConfiguracaoPix() {
    if ($f('vxPixSettingsModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="vx-charge-overlay" id="vxPixSettingsModal" aria-hidden="true">
        <section class="vx-charge-modal vx-pix-settings-modal" role="dialog" aria-modal="true" aria-labelledby="vxPixSettingsTitle">
          <div class="vx-charge-modal-head"><div><span>Recebimento</span><h2 id="vxPixSettingsTitle">Configurar PIX</h2><p>Cadastre uma vez. As próximas cobranças serão geradas automaticamente.</p></div><button type="button" onclick="fecharConfiguracaoPix()" aria-label="Fechar">×</button></div>
          <div class="vx-charge-form">
            <div class="vx-field"><label>Tipo de chave</label><select id="vxPixTipo"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="telefone">Telefone</option><option value="email">E-mail</option><option value="aleatoria">Chave aleatória</option></select></div>
            <div class="vx-field"><label>Chave PIX</label><input id="vxPixChave" autocomplete="off" placeholder="Informe sua chave"></div>
            <div class="vx-field"><label>Nome do recebedor</label><input id="vxPixNome" maxlength="25" placeholder="Como consta no banco"></div>
            <div class="vx-field"><label>Cidade</label><input id="vxPixCidade" maxlength="15" placeholder="Ex.: Manaus"></div>
          </div>
          <div class="vx-charge-modal-foot"><button class="vx-charge-secondary" onclick="fecharConfiguracaoPix()">Cancelar</button><button class="vx-charge-primary" id="vxSavePixSettings" onclick="salvarConfiguracaoPix()">Salvar configuração</button></div>
        </section>
      </div>`);
  }

  function abrirConfiguracaoPix() {
    montarEstruturaFinanceira();
    $f('vxPixTipo').value = campoPix('pix_tipo') || 'aleatoria';
    $f('vxPixChave').value = campoPix('pix_chave');
    $f('vxPixNome').value = campoPix('pix_nome_recebedor');
    $f('vxPixCidade').value = campoPix('pix_cidade');
    $f('vxPixSettingsModal').classList.add('open');
    $f('vxPixSettingsModal').setAttribute('aria-hidden', 'false');
    window.VYXORA_SCROLL?.lock('pix-settings-modal');
  }

  function fecharConfiguracaoPix() {
    $f('vxPixSettingsModal')?.classList.remove('open');
    $f('vxPixSettingsModal')?.setAttribute('aria-hidden', 'true');
    window.VYXORA_SCROLL?.unlock('pix-settings-modal');
  }

  async function salvarConfiguracaoPix() {
    const tipo = $f('vxPixTipo')?.value || 'aleatoria';
    const alteracoes = {
      pix_tipo: tipo, pix_chave: normalizarChavePix(tipo, $f('vxPixChave')?.value),
      pix_nome_recebedor: $f('vxPixNome')?.value.trim() || '', pix_cidade: $f('vxPixCidade')?.value.trim() || ''
    };
    if (!alteracoes.pix_chave) return window.toast?.('Informe sua chave PIX.', 'err');
    if (tipo === 'cpf' && alteracoes.pix_chave.length !== 11) return window.toast?.('O CPF da chave PIX precisa ter 11 números.', 'err');
    if (tipo === 'cnpj' && alteracoes.pix_chave.length !== 14) return window.toast?.('O CNPJ da chave PIX precisa ter 14 números.', 'err');
    if (tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alteracoes.pix_chave)) return window.toast?.('Informe um e-mail PIX válido.', 'err');
    if (tipo === 'telefone' && !/^\+55\d{10,11}$/.test(alteracoes.pix_chave)) return window.toast?.('Informe um telefone PIX brasileiro com DDD.', 'err');
    if (!alteracoes.pix_nome_recebedor) return window.toast?.('Informe o nome do recebedor.', 'err');
    if (!alteracoes.pix_cidade) return window.toast?.('Informe a cidade do recebedor.', 'err');
    const btn = $f('vxSavePixSettings');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
    try {
      const { data, error } = await window.db.from('agenda_empresas').update(alteracoes).eq('id', empresaId()).select('*').single();
      if (error) throw error;
      window.state.empresa = data;
      fecharConfiguracaoPix();
      window.showNotif?.('PIX configurado', 'Agora suas cobranças serão geradas automaticamente.', 'ok', 4000);
    } catch (error) {
      console.error(error);
      window.toast?.('Não foi possível salvar. Execute a atualização PIX no Supabase.', 'err');
    } finally { if (btn) { btn.disabled = false; btn.textContent = 'Salvar configuração'; } }
  }

  function criarVisualizadorDocumento() {
    if ($f('vxDocumentModal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="vx-doc-overlay" id="vxDocumentModal" aria-hidden="true"><section class="vx-doc-shell"><header><div><span id="vxDocType">Cobrança</span><strong id="vxDocTitle">Documento</strong></div><button onclick="fecharDocumentoFinanceiro()">×</button></header><div class="vx-doc-body" id="vxDocBody"></div><footer><button class="vx-charge-secondary" onclick="copiarLinkCobrancaAtual()">Copiar link</button><button class="vx-charge-primary" onclick="imprimirDocumentoFinanceiro()">Salvar PDF</button></footer></section></div>`);
  }

  function atualizarPreviewCobranca() {
    const nome = ($f('vxCobCliente')?.value || '').trim();
    const servico = ($f('vxCobServico')?.value || '').trim();
    const valor = Number($f('vxCobValor')?.value || 0);
    const vencimento = $f('vxCobVencimento')?.value || '';
    if ($f('vxPrevNome')) $f('vxPrevNome').textContent = nome || 'Nome do cliente';
    if ($f('vxPrevServico')) $f('vxPrevServico').textContent = servico || 'Serviço';
    if ($f('vxPrevAvatar')) $f('vxPrevAvatar').textContent = nome ? nome.trim().charAt(0).toUpperCase() : '?';
    if ($f('vxPrevValor')) $f('vxPrevValor').textContent = moeda(valor);
    if ($f('vxPrevVencimento')) $f('vxPrevVencimento').textContent = vencimento ? (typeof formatDate === 'function' ? formatDate(vencimento) : vencimento) : '—';
  }
  window.atualizarPreviewCobranca = atualizarPreviewCobranca;

  function abrirNovaCobranca() {
    montarEstruturaFinanceira();
    if (!pixConfigurado()) {
      window.toast?.('Configure seu PIX antes de criar a primeira cobrança.', 'warn');
      abrirConfiguracaoPix();
      return;
    }
    const select = $f('vxCobAgendamento');
    const cobrados = new Set((window.state?.cobrancas || []).filter(c => c.status !== 'cancelado' && c.agendamento_id).map(c => String(c.agendamento_id)));
    const agendamentos = (window.state?.agendamentos || []).filter(a => a.status !== 'Excluído' && !cobrados.has(String(a.id)));
    select.innerHTML = '<option value="">Cobrança sem agendamento</option>' + agendamentos.map(a => `<option value="${esc(a.id)}">${esc(a.cliente_nome)} · ${esc(a.servico_nome || 'Serviço')} · ${moeda(a.valor)}</option>`).join('');
    ['vxCobCliente','vxCobWhatsapp','vxCobServico','vxCobProfissional','vxCobValor'].forEach(id => { if ($f(id)) $f(id).value = ''; });
    $f('vxCobVencimento').value = addDias(2);
    atualizarPreviewCobranca();
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
    atualizarPreviewCobranca();
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
    const codigo = gerarCodigo('COB');
    const registro = {
      empresa_id: empresaId(), agendamento_id: agendamentoId, codigo, public_token: gerarToken(),
      cliente_nome: cliente, cliente_whatsapp: $f('vxCobWhatsapp')?.value.trim() || '', servico_nome: servico,
      profissional_nome: $f('vxCobProfissional')?.value.trim() || '', valor, vencimento: $f('vxCobVencimento')?.value || addDias(2),
      status: 'pendente', forma_pagamento: 'pix', pix_chave: campoPix('pix_chave'),
      pix_copia_cola: gerarPixCopiaCola(valor, codigo), link_pagamento: '',
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
        renderFinanceiroV2();
        window.renderStats?.();
        window.renderDashPremium?.();
        window.renderDashChart?.();
        window.showNotif?.('Pagamento confirmado!', `${c.cliente_nome} entrou em Recebidos.`, 'ok', 5000);
      } catch (error) { console.error(error); window.toast?.('Não foi possível confirmar o pagamento.', 'err'); }
    }});
  }

  async function cancelarCobranca(id) {
    const c = (window.state?.cobrancas || []).find(item => String(item.id) === String(id));
    if (!c || c.status === 'pago') return window.toast?.('Uma cobrança paga não pode ser cancelada.', 'warn');
    window.openConfirmModal?.({ icon: '×', type: 'danger', title: 'Excluir cobrança?', body: `A cobrança ${c.codigo} será apagada permanentemente.`, btnLabel: 'Excluir cobrança', cb: async () => {
      if (modoLocal) {
        const lista = lerLocal(empresaId()).filter(item => String(item.id) !== String(id)); salvarLocal(empresaId(), lista); window.state.cobrancas = lista;
      } else {
        const { data, error } = await window.db.from(TABLE).delete().eq('id', id).neq('status', 'pago').select('id').maybeSingle();
        if (error) return window.toast?.('Não foi possível excluir. Execute a atualização de segurança no Supabase.', 'err');
        if (!data) return window.toast?.('A cobrança já foi paga ou não existe mais.', 'warn');
        window.state.cobrancas = (window.state.cobrancas || []).filter(item => String(item.id) !== String(id));
      }
      renderFinanceiroV2(); window.showNotif?.('Cobrança excluída', c.codigo, 'info');
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
  async function copiarTextoSeguro(texto) {
    if (!texto) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch (_) {}
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    let copiado = false;
    try { copiado = document.execCommand('copy'); } catch (_) {}
    area.remove();
    return copiado;
  }

  async function copiarTexto(texto, mensagem) {
    const copiado = await copiarTextoSeguro(texto);
    window.toast?.(copiado ? mensagem : 'Não foi possível copiar.', copiado ? 'ok' : 'err');
    return copiado;
  }

  async function copiarPixPublico(botao) {
    const copiado = await copiarTextoSeguro(window.pixPublicoAtual || '');
    const retorno = $f('vxPublicCopyFeedback');
    if (copiado) {
      botao.classList.add('copied');
      botao.innerHTML = '<span>✓</span> PIX copiado';
      if (retorno) retorno.textContent = 'Código copiado. Agora cole no aplicativo do seu banco.';
      setTimeout(() => { botao.classList.remove('copied'); botao.innerHTML = '<span>▣</span> Copiar código PIX'; }, 2600);
    } else {
      if (retorno) retorno.textContent = 'Seu navegador bloqueou a cópia. Selecione o código acima e copie manualmente.';
    }
  }
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
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(tipo === 'recibo' ? cobranca.recibo_codigo : cobranca.codigo)}</title><link rel="stylesheet" href="${location.origin}${location.pathname.replace(/[^/]*$/, '')}financeiro-cobrancas.css?v=20260810-2"><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script></head><body class="vx-print-page">${documentoHTML(cobranca, tipo, false)}<script>window.onload=function(){var t=document.getElementById('vxDocumentQr');if(t&&window.QRCode)new QRCode(t,{text:${JSON.stringify(cobranca.pix_copia_cola || cobranca.link_pagamento || linkPublico(cobranca))},width:132,height:132,colorDark:'#07030D',colorLight:'#ffffff'});setTimeout(function(){window.print()},350)}<\/script></body></html>`);
    popup.document.close();
  }

  /* Menu "⋯" das ações secundárias — elemento único, fixed, reposicionado via JS a
     cada clique (evita ser cortado pelo overflow:hidden de .vx-fin-table, mesmo
     problema resolvido antes no tooltip da sidebar). */
  let menuAcaoEl = null;
  function getMenuAcaoEl() {
    if (!menuAcaoEl) {
      menuAcaoEl = document.createElement('div');
      menuAcaoEl.className = 'vx-action-dropdown';
      document.body.appendChild(menuAcaoEl);
      menuAcaoEl.addEventListener('click', (ev) => ev.stopPropagation());
    }
    return menuAcaoEl;
  }
  function toggleAcaoMenu(ev, chargeId) {
    ev.stopPropagation();
    const btn = ev.currentTarget;
    const menu = getMenuAcaoEl();
    const jaAberto = menu.classList.contains('open') && menu._btnAtual === btn;
    esconderAcaoMenu();
    if (jaAberto) return;
    menu.innerHTML = '';
    const itens = [
      ['Ver cobrança', () => abrirDocumentoFinanceiro(chargeId, 'cobranca')],
      ['Compartilhar no WhatsApp', () => compartilharCobranca(chargeId)],
      ['Cancelar cobrança', () => cancelarCobranca(chargeId), true]
    ];
    itens.forEach(([label, fn, danger]) => {
      const b = document.createElement('button');
      b.textContent = label;
      if (danger) b.className = 'is-danger';
      b.onclick = () => { esconderAcaoMenu(); fn(); };
      menu.appendChild(b);
    });
    menu._btnAtual = btn;
    const r = btn.getBoundingClientRect();
    menu.style.left = (r.right - 190) + 'px';
    menu.style.top = (r.bottom + 6) + 'px';
    menu.classList.add('open');
  }
  window.toggleAcaoMenu = toggleAcaoMenu;

  function esconderAcaoMenu() {
    if (menuAcaoEl) { menuAcaoEl.classList.remove('open'); menuAcaoEl._btnAtual = null; }
  }
  document.addEventListener('click', esconderAcaoMenu);
  document.addEventListener('scroll', esconderAcaoMenu, true);

  function acoesCobranca(c) {
    const status = statusReal(c);
    if (status === 'pago') return `<button class="vx-action primary" onclick="abrirDocumentoFinanceiro('${esc(c.id)}','recibo')">Ver recibo</button><button class="vx-action" onclick="abrirDocumentoFinanceiro('${esc(c.id)}','cobranca')">Cobrança</button>`;
    if (status === 'cancelado') return `<button class="vx-action" onclick="abrirDocumentoFinanceiro('${esc(c.id)}','cobranca')">Visualizar</button>`;
    return `<button class="vx-action primary" onclick="confirmarPagamentoCobranca('${esc(c.id)}')">Confirmar pagamento</button><button class="vx-action" onclick="copiarLinkCobranca('${esc(c.id)}')">Copiar link</button>
      <div class="vx-action-menu">
        <button class="vx-action icon" onclick="toggleAcaoMenu(event, '${esc(c.id)}')" aria-label="Mais opções">⋯</button>
      </div>`;
  }

  function cardCobranca(c) {
    const status = statusReal(c);
    return `<article class="vx-charge-card ${status}"><div class="vx-charge-main"><div class="vx-charge-client"><div class="vx-charge-avatar">${esc((c.cliente_nome || '?').slice(0,1).toUpperCase())}</div><div class="vx-charge-person"><strong>${esc(c.cliente_nome)}</strong><span>${esc(c.servico_nome)} · ${esc(c.codigo)}</span></div></div><div class="vx-charge-date" data-label="Criação">${dataBR(c.criado_em)}</div><div class="vx-charge-date" data-label="Vencimento">${dataBR(c.vencimento)}</div><div class="vx-charge-amount"><strong>${moeda(c.valor)}</strong></div><span class="vx-status ${status}">${textoStatus(status)}</span></div><div class="vx-charge-actions">${acoesCobranca(c)}</div></article>`;
  }

  function listaFinanceiraHTML(lista, vazioTitulo, vazioTexto) {
    if (!lista.length) return vazioFinanceiro(vazioTitulo, vazioTexto);
    return `<div class="vx-fin-table"><div class="vx-fin-table-head"><span>Cliente</span><span>Criação</span><span>Vencimento</span><span>Valor</span><span>Situação</span><span>Ações</span></div>${lista.map(cardCobranca).join('')}</div>`;
  }

  function linhaRelatorio(c) {
    const pago = c.status === 'pago';
    return `<div class="vx-report-row"><div class="vx-report-person"><span>${esc((c.cliente_nome || '?').slice(0,1).toUpperCase())}</span><div><strong>${esc(c.cliente_nome)}</strong><small>${esc(c.servico_nome)} · ${esc(c.codigo)}</small></div></div><div data-label="Início">${dataBR(c.criado_em)}</div><div data-label="Término">${dataBR(pago ? c.pago_em : c.vencimento)}</div><div data-label="Valor"><strong>${moeda(c.valor)}</strong></div><div data-label="Situação"><span class="vx-status ${pago ? 'pago' : statusReal(c)}">${pago ? 'Confirmado' : textoStatus(statusReal(c))}</span></div><div class="vx-report-action">${pago ? `<button onclick="abrirDocumentoFinanceiro('${esc(c.id)}','recibo')">Ver recibo</button>` : `<button onclick="abrirDocumentoFinanceiro('${esc(c.id)}','cobranca')">Ver cobrança</button>`}</div></div>`;
  }

  function renderRelatoriosFinanceiros() {
    const target = $f('vxFinancialReports');
    if (!target) return;
    const lista = [...(window.state?.cobrancas || [])].filter(c => c.status !== 'cancelado').sort((a,b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
    const pagas = lista.filter(c => c.status === 'pago');
    const pendentes = lista.filter(c => c.status !== 'pago');
    const recebido = pagas.reduce((total,c) => total + Number(c.valor || 0), 0);
    target.innerHTML = `<section class="vx-report-summary"><article><span>Documentos</span><strong>${lista.length}</strong><small>Cobranças e recibos</small></article><article><span>Confirmados</span><strong>${pagas.length}</strong><small>${moeda(recebido)} recebido</small></article><article><span>Pendentes</span><strong>${pendentes.length}</strong><small>Aguardando pagamento</small></article></section><section class="vx-report-panel"><header><div><span>Histórico financeiro</span><strong>Documentos gerados</strong></div><small>Atualizado automaticamente</small></header>${lista.length ? `<div class="vx-report-table"><div class="vx-report-head"><span>Nome</span><span>Data de início</span><span>Data de término</span><span>Valor</span><span>Situação</span><span>Documento</span></div>${lista.map(linhaRelatorio).join('')}</div>` : vazioFinanceiro('Nenhum documento gerado', 'Cobranças e recibos aparecerão aqui.')}</section>`;
  }

  function vazioFinanceiro(titulo, texto) { return `<div class="vx-fin-empty"><span>◇</span><strong>${titulo}</strong><p>${texto}</p></div>`; }

  function renderFinanceiroV2() {
    montarEstruturaFinanceira();
    posicionarIndicadorFinTabs(); // garante o indicador correto mesmo no 1º carregamento
    const lista = [...(window.state?.cobrancas || [])].filter(c => c.status !== 'cancelado').sort((a,b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
    const pagas = lista.filter(c => c.status === 'pago');
    const pendentes = lista.filter(c => ['pendente','vencido'].includes(statusReal(c)));
    const recebidosTotal = pagas.reduce((s,c) => s + Number(c.valor || 0), 0);
    const pendenteTotal = pendentes.reduce((s,c) => s + Number(c.valor || 0), 0);
    const mes = dataHoje().slice(0,7);
    const recebidoMes = pagas.filter(c => String(c.pago_em || '').slice(0,7) === mes).reduce((s,c) => s + Number(c.valor || 0), 0);
    $f('vxPendingBadge').textContent = pendentes.length;
    $f('vxFinMetrics').innerHTML = `<article><span>Recebidos</span><strong>${moeda(recebidosTotal)}</strong><small>${pagas.length} pagamento${pagas.length === 1 ? '' : 's'} confirmado${pagas.length === 1 ? '' : 's'}</small></article><article><span>A receber</span><strong>${moeda(pendenteTotal)}</strong><small>${pendentes.length} cobrança${pendentes.length === 1 ? '' : 's'} em aberto</small></article><article><span>Recebido no mês</span><strong>${moeda(recebidoMes)}</strong><small>${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</small></article><article><span>Total de cobranças</span><strong>${lista.length}</strong><small>Histórico completo</small></article>`;
    $f('vxRecentCharges').innerHTML = listaFinanceiraHTML(lista.slice(0,4), 'Nenhuma cobrança criada', 'Crie a primeira cobrança para começar.');
    const filtro = $f('vxChargeFilter')?.value || 'todos';
    const filtradas = filtro === 'todos' ? lista : lista.filter(c => statusReal(c) === filtro);
    $f('vxChargeList').innerHTML = listaFinanceiraHTML(filtradas, 'Nada por aqui', 'Nenhuma cobrança corresponde a este filtro.');
    $f('vxReceivedList').innerHTML = listaFinanceiraHTML(pagas, 'Nenhum recebido', 'Confirme um pagamento para liberar o recibo.');
    renderRelatoriosFinanceiros();
    mudarAbaFinanceiro(abaAtual, false);
  }

  function mudarAbaFinanceiro(aba, renderizar = true) {
    abaAtual = aba;
    document.querySelectorAll('[data-fin-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.finTab === aba));
    document.querySelectorAll('[data-fin-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.finPane === aba));
    posicionarIndicadorFinTabs();
    if (renderizar) renderFinanceiroV2();
  }

  function posicionarIndicadorFinTabs() {
    const wrap = $f('vxFinTabs'), indicator = $f('vxFinTabIndicator');
    const ativo = wrap ? wrap.querySelector('button.active') : null;
    if (!wrap || !indicator || !ativo) return;
    indicator.style.left = ativo.offsetLeft + 'px';
    indicator.style.width = ativo.offsetWidth + 'px';
  }
  window.addEventListener('resize', posicionarIndicadorFinTabs);

  function compartilharCobranca(id) {
    const c = (window.state?.cobrancas || []).find(item => String(item.id) === String(id)); if (!c) return;
    const texto = `Olá, ${c.cliente_nome}! Sua cobrança de ${moeda(c.valor)} por ${c.servico_nome} está disponível: ${linkPublico(c)}`;
    const tel = String(c.cliente_whatsapp || '').replace(/\D/g,'');
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  function copiarLinkCobranca(id) {
    const c = (window.state?.cobrancas || []).find(item => String(item.id) === String(id));
    if (c) copiarTexto(linkPublico(c), 'Link de pagamento copiado.');
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
    window.pixPublicoAtual = data.pix_copia_cola || '';
    const pago = data.status === 'pago';
    view.innerHTML = `<main class="vx-pay-page">
      <header class="vx-pay-brand"><div class="vx-pay-logo">V</div><div><strong>VYXORA</strong><span>Pagamentos</span></div><div class="vx-pay-secure"><i></i> Ambiente seguro</div></header>
      <section class="vx-pay-card ${pago ? 'is-paid' : ''}">
        <div class="vx-pay-status"><span>${pago ? '✓' : '⌁'}</span><div><small>${pago ? 'Pagamento concluído' : 'Cobrança via PIX'}</small><strong>${pago ? 'Pagamento confirmado' : `Pague ${moeda(data.valor)}`}</strong></div></div>
        <div class="vx-pay-summary"><div><span>Você está pagando para</span><strong>${esc(data.empresa_nome || 'Estabelecimento')}</strong><small>${esc(data.servico_nome || 'Serviço')} ${data.profissional_nome ? `· ${esc(data.profissional_nome)}` : ''}</small></div><div><span>Valor</span><strong>${moeda(data.valor)}</strong></div></div>
        ${pago ? `<div class="vx-pay-success"><span>✓</span><h2>Pagamento já confirmado</h2><p>Esta cobrança foi quitada em ${dataBR(data.pago_em)}.</p><small>${esc(data.codigo)}</small></div>` : `<div class="vx-pay-content">
          <section class="vx-pay-qr"><div class="vx-pay-qr-frame"><div id="vxPublicQr"></div></div><strong>Escaneie o QR Code</strong><span>Abra o aplicativo do seu banco e escolha pagar com PIX.</span></section>
          <section class="vx-pay-copy"><span class="vx-pay-step">Ou use o PIX Copia e Cola</span><label for="vxPublicPixCode">Código PIX</label><textarea id="vxPublicPixCode" readonly onclick="this.select()">${esc(data.pix_copia_cola || '')}</textarea><button type="button" onclick="copiarPixPublico(this)"><span>▣</span> Copiar código PIX</button><p id="vxPublicCopyFeedback">Depois de copiar, cole o código na área PIX do seu banco.</p></section>
        </div>`}
        <footer><span>Identificador</span><strong>${esc(data.codigo)}</strong><span>Vencimento</span><strong>${dataBR(data.vencimento)}</strong></footer>
      </section>
      <div class="vx-pay-trust"><span>▣ Seus dados estão protegidos</span><span>A VYXORA não solicita sua senha bancária.</span></div>
    </main>`;
    const qr = $f('vxPublicQr'); if (qr && window.QRCode && data.pix_copia_cola) new window.QRCode(qr,{text:data.pix_copia_cola,width:190,height:190,colorDark:'#07030D',colorLight:'#fff',correctLevel:window.QRCode.CorrectLevel.M});
  }

  window.loadCobrancasFinanceiras = loadCobrancasFinanceiras;
  window.renderFinanceiroV2 = renderFinanceiroV2;
  window.abrirNovaCobranca = abrirNovaCobranca;
  window.fecharNovaCobranca = fecharNovaCobranca;
  window.preencherCobrancaPorAgendamento = preencherCobrancaPorAgendamento;
  window.salvarNovaCobranca = salvarNovaCobranca;
  window.abrirConfiguracaoPix = abrirConfiguracaoPix;
  window.fecharConfiguracaoPix = fecharConfiguracaoPix;
  window.salvarConfiguracaoPix = salvarConfiguracaoPix;
  window.confirmarPagamentoCobranca = confirmarPagamentoCobranca;
  window.cancelarCobranca = cancelarCobranca;
  window.abrirDocumentoFinanceiro = abrirDocumentoFinanceiro;
  window.fecharDocumentoFinanceiro = fecharDocumentoFinanceiro;
  window.copiarLinkCobrancaAtual = copiarLinkCobrancaAtual;
  window.imprimirDocumentoFinanceiro = imprimirDocumentoFinanceiro;
  window.mudarAbaFinanceiro = mudarAbaFinanceiro;
  window.compartilharCobranca = compartilharCobranca;
  window.copiarLinkCobranca = copiarLinkCobranca;
  window.copiarPixPublico = copiarPixPublico;
  window.renderRelatoriosFinanceiros = renderRelatoriosFinanceiros;
  window.isPublicChargeRoute = isPublicChargeRoute;
  window.loadPublicChargeRoute = loadPublicChargeRoute;

  document.addEventListener('DOMContentLoaded', () => {
    montarEstruturaFinanceira();
    $f('vxChargeModal')?.addEventListener('click', event => { if (event.target.id === 'vxChargeModal') fecharNovaCobranca(); });
    $f('vxPixSettingsModal')?.addEventListener('click', event => { if (event.target.id === 'vxPixSettingsModal') fecharConfiguracaoPix(); });
    $f('vxDocumentModal')?.addEventListener('click', event => { if (event.target.id === 'vxDocumentModal') fecharDocumentoFinanceiro(); });
  });
})();
