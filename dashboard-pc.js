/* ============================================================
   VYXORA — Dashboard PC (reconstrução visual completa)
   Não duplica regra de negócio: lê `state` e as funções globais
   já existentes em app.js (money, normStatus, isFinanceiro,
   formatDate, badgeClass, ordenarAtendimentosAgendados, etc).
   Só é executado/visível em telas >=901px — o Android/WebApp
   continua usando exatamente a implementação antiga (dashAptList,
   dashChartSvg, dashDonut...), intocada.
   ============================================================ */
(function () {
  const $id = (id) => document.getElementById(id);

  function mirrorText(fromId, toId) {
    const f = $id(fromId), t = $id(toId);
    if (f && t) t.textContent = f.textContent;
  }

  function mirrorDelta(fromId, toId) {
    const f = $id(fromId), t = $id(toId);
    if (!f || !t) return;
    t.textContent = f.textContent;
    t.classList.remove('up', 'down');
    if (f.classList.contains('up')) t.classList.add('up');
    else if (f.classList.contains('down')) t.classList.add('down');
  }

  /* ---------- KPIs (topo) ---------- */
  function renderVxdKpis() {
    if (!$id('vxdKpiFatHoje')) return;
    mirrorText('statFatHoje', 'vxdKpiFatHoje');
    mirrorText('statFatMes', 'vxdKpiFatMes');
    mirrorText('statTaxa', 'vxdKpiTaxa');
    mirrorText('statClientes', 'vxdKpiClientes');
    mirrorDelta('statFatHojeDelta', 'vxdKpiFatHojeDelta');
    mirrorDelta('statFatMesDelta', 'vxdKpiFatMesDelta');
    mirrorDelta('statTaxaDelta', 'vxdKpiTaxaDelta');
    mirrorDelta('statClientesDelta', 'vxdKpiClientesDelta');
  }

  /* ---------- Substrip de status (dados reais já calculados em renderStats) ---------- */
  function renderVxdSubstrip() {
    const el = $id('vxdSubstrip');
    if (!el) return;
    const chips = [
      { label: 'Hoje', from: 'statHoje', tone: '' },
      { label: 'Pendentes', from: 'statPendentes', tone: 'tone-yellow' },
      { label: 'Confirmados', from: 'statConfirmados', tone: 'tone-green' },
      { label: 'Concluídos', from: 'statConcluidos', tone: 'tone-blue' },
      { label: 'Reagendados', from: 'statReagendados', tone: 'tone-purple' },
      { label: 'Recusados', from: 'statRecusados', tone: 'tone-red' }
    ];
    el.innerHTML = chips.map(c => {
      const src = $id(c.from);
      const val = src ? src.textContent : '0';
      return `<div class="vxd-chip"><span class="vxd-chip-label">${c.label}</span><span class="vxd-chip-value ${c.tone}">${val}</span></div>`;
    }).join('');
  }

  /* ---------- Agendamentos recentes (sem gráfico — tabela simples com dado real) ---------- */
  function renderVxdRecentTable() {
    const el = $id('vxdRecentTable');
    if (!el || typeof state === 'undefined') return;
    const todos = (state.agendamentos || []).filter(a => (typeof normStatus === 'function' ? normStatus(a.status) : a.status) !== 'Excluído');
    const ordenados = todos.slice().sort((a, b) => {
      const da = Date.parse(a.criado_em || '') || 0, db = Date.parse(b.criado_em || '') || 0;
      return db - da;
    });
    const linhas = ordenados.slice(0, 8);
    if (!linhas.length) {
      el.innerHTML = '<div class="vxd-empty">Nenhum agendamento ainda.</div>';
      return;
    }
    const fmtMoney = (v) => (typeof money === 'function') ? money(v).replace(',00', '') : 'R$' + v;
    const fmtData = (a) => {
      const df = (typeof formatDate === 'function') ? formatDate(a.data) : (a.data || '—');
      return df + (a.hora ? ' ' + a.hora : '');
    };
    const statusClasse = { Confirmado: 'st-confirmado', Pendente: 'st-pendente', 'Concluído': 'st-concluido', Recusado: 'st-recusado', Reagendado: 'st-reagendado' };
    el.innerHTML =
      `<div class="vxd-recent-head"><span>Cliente</span><span>Serviço</span><span>Data</span><span>Valor</span><span>Status</span></div>` +
      linhas.map(a => {
        const status = (typeof normStatus === 'function') ? normStatus(a.status) : a.status;
        const classe = statusClasse[status] || 'st-reagendado';
        return `<div class="vxd-recent-row">
          <span class="vxd-recent-cliente">${a.cliente_nome || 'Cliente'}</span>
          <span class="vxd-recent-servico">${a.servico_nome || '—'}</span>
          <span class="vxd-recent-data">${fmtData(a)}</span>
          <span class="vxd-recent-valor">${fmtMoney(a.valor || 0)}</span>
          <span class="vxd-recent-status ${classe}">${status}</span>
        </div>`;
      }).join('');
  }

  /* ---------- Atividade recente (usa os mesmos agendamentos reais do dashAptList) ---------- */
  function tempoRelativo(a) {
    if (!a.data) return '—';
    try {
      const hojeISOStr = (typeof hojeISO === 'function') ? hojeISO() : new Date().toISOString().slice(0, 10);
      const hora = a.hora || '';
      if (a.data === hojeISOStr) return 'Hoje' + (hora ? ' às ' + hora : '');
      const amanha = new Date(hojeISOStr + 'T00:00:00'); amanha.setDate(amanha.getDate() + 1);
      const amanhaISO = amanha.toISOString().slice(0, 10);
      if (a.data === amanhaISO) return 'Amanhã' + (hora ? ' às ' + hora : '');
      const dataFmt = (typeof formatDate === 'function') ? formatDate(a.data) : a.data;
      return dataFmt + (hora ? ' às ' + hora : '');
    } catch (e) { return a.data || '—'; }
  }

  function renderVxdActivity() {
    const el = $id('vxdActivityList');
    if (!el || typeof state === 'undefined') return;
    const ags = (typeof ordenarAtendimentosAgendados === 'function')
      ? ordenarAtendimentosAgendados(state.agendamentos)
      : (state.agendamentos || []);
    const visiveis = ags
      .filter(a => ['Pendente', 'Confirmado', 'Reagendado', 'Concluído'].includes((typeof normStatus === 'function') ? normStatus(a.status) : a.status))
      .slice(0, 7);
    if (!visiveis.length) {
      el.innerHTML = '<div class="vxd-empty">Nenhuma atividade recente.</div>';
      return;
    }
    const toneMap = { Confirmado: 'tone-green', Pendente: 'tone-yellow', 'Concluído': 'tone-blue', Reagendado: '', Recusado: 'tone-red' };
    el.innerHTML = visiveis.map(a => {
      const status = (typeof normStatus === 'function') ? normStatus(a.status) : a.status;
      const nomeIni = (typeof initial === 'function') ? initial(a.cliente_nome) : (a.cliente_nome || '?').charAt(0).toUpperCase();
      const tone = toneMap[status] || '';
      return `<div class="vxd-activity-item">
        <div class="vxd-activity-icon ${tone}">${nomeIni}</div>
        <div class="vxd-activity-body">
          <div class="vxd-activity-title">${a.cliente_nome || 'Cliente'} · ${status}</div>
          <div class="vxd-activity-sub">${a.servico_nome || '—'} · ${a.profissional_nome || '—'}</div>
        </div>
        <div class="vxd-activity-time">${tempoRelativo(a)}</div>
      </div>`;
    }).join('');
  }

  function renderVxdDashboard() {
    renderVxdKpis();
    renderVxdSubstrip();
    renderVxdRecentTable();
    renderVxdActivity();
  }

  window.renderVxdDashboard = renderVxdDashboard;
})();
