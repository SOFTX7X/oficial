/* ============================================================
   VYXORA — Dashboard PC (reconstrução visual completa)
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

  function mirrorSparkPath(fromSvgId, toSvgId) {
    const f = $id(fromSvgId), t = $id(toSvgId);
    if (!f || !t) return;
    const fp = f.querySelector('path'), tp = t.querySelector('path');
    if (fp && tp) tp.setAttribute('d', fp.getAttribute('d') || '');
  }

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
    mirrorSparkPath('statFatHojeSpark', 'vxdKpiFatHojeSpark');
    mirrorSparkPath('statFatMesSpark', 'vxdKpiFatMesSpark');
    mirrorSparkPath('statTaxaSpark', 'vxdKpiTaxaSpark');
    mirrorSparkPath('statClientesSpark', 'vxdKpiClientesSpark');
  }

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

  let vxdPeriod = 'dias';
  let vxdChartInstance = null;

  const RANGE_LABEL = { dias: 'Últimos 14 dias', semanas: 'Últimas 8 semanas', meses: 'Últimos 6 meses' };
  const DIAS_POR_OFFSET = { dias: 14, semanas: 56, meses: 183 };

  function contaAbertaEmVxd() {
    const emp = window.state && window.state.empresa;
    if (emp && emp.criado_em) {
      const d = new Date(emp.criado_em);
      if (!isNaN(d.getTime())) return d;
    }
    const ags = (window.state && window.state.agendamentos) || [];
    let minData = null;
    ags.forEach(a => { if (a.data && (!minData || a.data < minData)) minData = a.data; });
    if (minData) {
      const d = new Date(minData + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function primeiroIndiceVisivelVxd(period, n) {
    if (period !== 'dias') return 0;
    const abertura = contaAbertaEmVxd();
    if (!abertura) return 0;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const aberturaZero = new Date(abertura); aberturaZero.setHours(0, 0, 0, 0);

    for (let idx = 0; idx < n; idx++) {
      const i = (n - 1) - idx;
      const fimDoPonto = new Date(hoje); fimDoPonto.setDate(fimDoPonto.getDate() - i);
      if (fimDoPonto >= aberturaZero) return idx;
    }
    return n - 1;
  }

  function baselineAcumuladoVxd(period) {
    const zero = { confirmados: 0, recusados: 0, concluidos: 0 };
    const ags = (window.state && window.state.agendamentos) || [];
    if (!ags.length || typeof window.getStatusSeries !== 'function') return zero;

    let minData = null;
    ags.forEach(a => { if (a.data && (!minData || a.data < minData)) minData = a.data; });
    if (!minData) return zero;

    const hoje = new Date();
    const min = new Date(minData + 'T00:00:00');
    if (isNaN(min.getTime())) return zero;
    const diasTotais = Math.max(0, Math.round((hoje - min) / 86400000));
    const blocoDias = DIAS_POR_OFFSET[period] || 14;
    const maxOffset = Math.min(30, Math.ceil(diasTotais / blocoDias));

    const acc = { confirmados: 0, recusados: 0, concluidos: 0 };
    for (let off = maxOffset; off >= 1; off--) {
      const pts = window.getStatusSeries(period, off);
      pts.forEach(p => { acc.confirmados += p.confirmados; acc.recusados += p.recusados; acc.concluidos += p.concluidos; });
    }
    return acc;
  }

  function renderVxdChart() {
    const canvas = $id('vxdChartCanvas');
    if (!canvas || typeof window.getStatusSeries !== 'function' || typeof Chart === 'undefined') return;

    const rangeEl = $id('vxdChartRangeLabel');
    if (rangeEl) rangeEl.textContent = RANGE_LABEL[vxdPeriod] || RANGE_LABEL.dias;

    const pontosRaw = window.getStatusSeries(vxdPeriod);
    const baseline = baselineAcumuladoVxd(vxdPeriod);
    let accConf = baseline.confirmados, accConc = baseline.concluidos, accRec = baseline.recusados;
    let pontos = pontosRaw.map(p => {
      accConf += p.confirmados;
      accConc += p.concluidos;
      accRec += p.recusados;
      return { ...p, confirmados: accConf, concluidos: accConc, recusados: accRec };
    });

    const primeiroIdx = primeiroIndiceVisivelVxd(vxdPeriod, pontos.length);
    if (primeiroIdx > 0) pontos = pontos.slice(primeiroIdx);

    const labels = pontos.map(p => p.label);
    const dadosConfirmados = pontos.map(p => p.confirmados);
    const dadosRecusados = pontos.map(p => -p.recusados); // Retornado o negativo para separar visualmente abaixo do eixo zero
    const dadosConcluidos = pontos.map(p => p.concluidos);

    const ctx = canvas.getContext('2d');
    const CORES = { confirmados: '#22c55e', recusados: '#ff5a5f', concluidos: '#8A2BE2' };
    
    const gradiente = (cor) => {
      const g = ctx.createLinearGradient(0, 0, 0, 220);
      g.addColorStop(0, cor + '26');
      g.addColorStop(1, cor + '00');
      return g;
    };

    if (vxdChartInstance) {
      vxdChartInstance.data.labels = labels;
      vxdChartInstance.data.datasets[0].data = dadosConfirmados;
      vxdChartInstance.data.datasets[1].data = dadosRecusados;
      vxdChartInstance.data.datasets[2].data = dadosConcluidos;
      vxdChartInstance.update();
      return;
    }

    vxdChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Confirmados', data: dadosConfirmados, borderColor: CORES.confirmados, backgroundColor: gradiente(CORES.confirmados), borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: CORES.confirmados },
          { label: 'Recusados', data: dadosRecusados, borderColor: CORES.recusados, backgroundColor: gradiente(CORES.recusados), borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: CORES.recusados },
          { label: 'Concluídos', data: dadosConcluidos, borderColor: CORES.concluidos, backgroundColor: gradiente(CORES.concluidos), borderWidth: 3, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: CORES.concluidos }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1a1a1a',
            titleColor: '#fff',
            bodyColor: '#ddd',
            borderColor: 'rgba(255,255,255,.08)',
            borderWidth: 1,
            padding: 10,
            usePointStyle: true,
            boxPadding: 4,
            callbacks: {
              label: (item) => `${item.dataset.label}: ${Math.abs(item.parsed.y)}`
            }
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', font: { size: 10 } } },
          y: {
            grid: { color: (ctx) => ctx.tick && ctx.tick.value === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)' },
            ticks: { color: '#888', font: { size: 10 }, callback: (v) => Math.abs(v) }
          }
        },
        animation: { duration: 500, easing: 'easeInOutQuad' }
      }
    });
  }

  function posicionarIndicadorVxdTabs() {
    const wrap = $id('vxdTabs'), indicator = $id('vxdTabIndicator');
    const ativo = wrap ? wrap.querySelector('.vxd-tab.active') : null;
    if (!wrap || !indicator || !ativo) return;
    indicator.style.left = ativo.offsetLeft + 'px';
    indicator.style.width = ativo.offsetWidth + 'px';
  }

  function setVxdChartPeriod(period) {
    vxdPeriod = period;
    document.querySelectorAll('.vxd-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    posicionarIndicadorVxdTabs();
    renderVxdChart();
  }
  window.setVxdChartPeriod = setVxdChartPeriod;
  window.addEventListener('resize', posicionarIndicadorVxdTabs);

  function tempoRelativo(a) {
    if (!a.data) return '—';
    try {
      const hojeISOStr = (typeof hojeISO === 'function') ? hojeISO() : new Date().toISOString().slice(0, 10);
      const hora = a.hora || '';
      if (a.data === hojeISOStr) return 'Hoje' + (hora ? ' às ' + hora : '');
      const amanha = new Date(hojeISOStr + 'T00:00:00'); amanha.setDate(amanha.getDate() + 1);
      const amanhaISO = amanha.toISOString().slice(0, 10);
      if (a.data === amanhaISO) return 'Amanhã' + (hora ? ' às ' + hora : '');
      return ((typeof formatDate === 'function') ? formatDate(a.data) : a.data) + (hora ? ' às ' + hora : '');
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

  function renderVxdServices() {
    const el = $id('vxdServicesTable');
    if (!el || typeof state === 'undefined') return;
    const mes = (typeof mesPrefixo === 'function') ? mesPrefixo() : '';
    const ags = (state.agendamentos || []).filter(a =>
      (a.data || '').startsWith(mes) &&
      (typeof normStatus === 'function' ? normStatus(a.status) : a.status) !== 'Excluído' &&
      (typeof normStatus === 'function' ? normStatus(a.status) : a.status) !== 'Recusado'
    );
    const porServico = {};
    ags.forEach(a => {
      const nome = a.servico_nome || 'Não informado';
      if (!porServico[nome]) porServico[nome] = { nome, count: 0, receita: 0 };
      porServico[nome].count += 1;
      if (typeof isFinanceiro === 'function' && isFinanceiro(a)) porServico[nome].receita += Number(a.valor || 0);
    });
    const linhas = Object.values(porServico).sort((a, b) => b.count - a.count).slice(0, 5);
    if (!linhas.length) {
      el.innerHTML = '<div class="vxd-empty">Nenhum agendamento este mês ainda.</div>';
      return;
    }
    const maxCount = Math.max(...linhas.map(l => l.count), 1);
    const fmtMoney = (v) => (typeof money === 'function') ? money(v).replace(',00', '') : 'R$' + v;
    el.innerHTML =
      `<div class="vxd-services-head"><span>Serviço</span><span>Qtd.</span><span>Ocupação</span><span>Receita</span></div>` +
      linhas.map(l => {
        const pct = Math.round((l.count / maxCount) * 100);
        return `<div class="vxd-services-row">
          <span class="vxd-services-name">${l.nome}</span>
          <span class="vxd-services-count">${l.count}</span>
          <span class="vxd-services-bar-wrap"><span class="vxd-services-bar" style="width:${pct}%"></span></span>
          <span class="vxd-services-revenue">${fmtMoney(l.receita)}</span>
        </div>`;
      }).join('');
  }

  function renderVxdDonut() {
    if (!$id('vxdDonutValue')) return;
    const R = 60, C = 2 * Math.PI * R;
    const pairs = [
      ['dashDonutConcluidos', 'vxdDonutConcluidos'],
      ['dashDonutConfirmados', 'vxdDonutConfirmados'],
      ['dashDonutPendentes', 'vxdDonutPendentes']
    ];
    pairs.forEach(([fromId, toId]) => {
      const f = $id(fromId), t = $id(toId);
      if (!f || !t) return;
      const fracFromOld = f.style.strokeDasharray || '0 326.7';
      const len = parseFloat(fracFromOld) || 0;
      const frac = len / 326.7;
      const newLen = Math.max(0, frac * C - (frac > 0 ? 2 : 0));
      t.style.strokeDasharray = `${newLen} ${C - newLen}`;
      t.style.strokeDashoffset = f.style.strokeDashoffset || '0';
    });
    mirrorText('dashLegConcluidos', 'vxdLegConcluidos');
    mirrorText('dashLegConfirmados', 'vxdLegConfirmados');
    mirrorText('dashLegPendentes', 'vxdLegPendentes');

    const totalEl = $id('dashDonutValue');
    const concEl = $id('dashLegConcluidos');
    const total = totalEl ? Number(totalEl.textContent) || 0 : 0;
    const concluidos = concEl ? Number(concEl.textContent) || 0 : 0;
    const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    $id('vxdDonutValue').textContent = pct + '%';
    mirrorDelta('statTaxaDelta', 'vxdDonutDelta');
  }

  function renderVxdDashboard() {
    renderVxdKpis();
    renderVxdSubstrip();
    renderVxdChart();
    renderVxdActivity();
    renderVxdServices();
    renderVxdDonut();
  }

  window.renderVxdDashboard = renderVxdDashboard;
})();
        
