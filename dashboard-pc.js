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

  function mirrorSparkPath(fromSvgId, toSvgId) {
    const f = $id(fromSvgId), t = $id(toSvgId);
    if (!f || !t) return;
    const fp = f.querySelector('path'), tp = t.querySelector('path');
    if (fp && tp) tp.setAttribute('d', fp.getAttribute('d') || '');
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
    mirrorSparkPath('statFatHojeSpark', 'vxdKpiFatHojeSpark');
    mirrorSparkPath('statFatMesSpark', 'vxdKpiFatMesSpark');
    mirrorSparkPath('statTaxaSpark', 'vxdKpiTaxaSpark');
    mirrorSparkPath('statClientesSpark', 'vxdKpiClientesSpark');
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

  /* ---------- Gráfico principal: reconstrução completa ---------- */
  /* Usa getStatusSeries() (função pura já existente no app.js) diretamente — não
     duplica regra de negócio, só transforma o retorno dela em geometria SVG.
     Período do PC é INDEPENDENTE do período do Android (variável própria abaixo),
     então trocar de aba aqui nunca afeta o que o Android mostra. */
  let vxdPeriod = 'dias';
  let vxdPontos = [];   // pontos em coordenadas de dado (não pixel), usados pelo hover
  let vxdPixels = [];   // pontos já convertidos pra pixel (x compartilhado entre as 3 séries)

  const RANGE_LABEL = { dias: 'Últimos 14 dias', semanas: 'Últimas 8 semanas', meses: 'Últimos 6 meses' };

  /* Interpolação monotônica (Fritsch–Carlson) — cúbica suave que NUNCA ultrapassa
     os valores dos pontos vizinhos, ao contrário de Catmull-Rom (que "mergulha"
     abaixo da base quando um valor baixo é seguido de um pico forte). */
  function monotonePath(pts) {
    const n = pts.length;
    if (n === 0) return '';
    if (n === 1) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    const dx = [], dy = [], m = [];
    for (let i = 0; i < n - 1; i++) {
      dx.push(pts[i + 1].x - pts[i].x);
      dy.push(pts[i + 1].y - pts[i].y);
      m.push(dx[i] === 0 ? 0 : dy[i] / dx[i]);
    }
    const t = new Array(n);
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = (m[i - 1] * m[i] <= 0) ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); t[i] = tau * a * m[i]; t[i + 1] = tau * b * m[i]; }
    }
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], h = dx[i];
      const c1x = p0.x + h / 3, c1y = p0.y + t[i] * h / 3;
      const c2x = p1.x - h / 3, c2y = p1.y - t[i + 1] * h / 3;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  }

  function renderVxdChart() {
    const svg = $id('vxdChartSvg');
    if (!svg || typeof window.getStatusSeries !== 'function') return;

    const rangeEl = $id('vxdChartRangeLabel');
    if (rangeEl) rangeEl.textContent = RANGE_LABEL[vxdPeriod] || RANGE_LABEL.dias;

    // Transforma os valores por período (do getStatusSeries, sem alterar essa função)
    // em ACUMULADO: cada ponto soma o valor do ponto anterior. Começa em zero na
    // ponta esquerda (data mais antiga do período) e nunca reseta.
    const pontosRaw = window.getStatusSeries(vxdPeriod);
    let accConf = 0, accConc = 0, accRec = 0;
    const pontos = pontosRaw.map(p => {
      accConf += p.confirmados;
      accConc += p.concluidos;
      accRec += p.recusados;
      return { ...p, confirmados: accConf, concluidos: accConc, recusados: accRec };
    });
    vxdPontos = pontos; // já acumulado — é isso que aparece no hover/tooltip também
    const n = pontos.length;

    // Linha de zero no meio do gráfico: Confirmados/Concluídos sobem a partir dela
    // (bom desempenho), Recusados desce a partir dela (mau desempenho) — como um
    // painel de trading onde "sobe" é positivo e "desce" é negativo.
    const W = 640, H = 220, padX = 12, topY = 10, bottomY = 210;
    const zeroY = (topY + bottomY) / 2;
    const maxUp = Math.max(1, ...pontos.map(p => Math.max(p.confirmados, p.concluidos))) * 1.08;
    const maxDown = Math.max(1, ...pontos.map(p => p.recusados)) * 1.08;
    const stepX = n > 1 ? (W - padX * 2) / (n - 1) : 0;
    const xAt = i => padX + i * stepX;
    const yUp = v => zeroY - (v / maxUp) * (zeroY - topY);
    const yDown = v => zeroY + (v / maxDown) * (bottomY - zeroY);

    vxdPixels = pontos.map((p, i) => ({
      x: xAt(i),
      confirmados: { x: xAt(i), y: yUp(p.confirmados) },
      concluidos: { x: xAt(i), y: yUp(p.concluidos) },
      recusados: { x: xAt(i), y: yDown(p.recusados) }
    }));

    const grid = $id('vxdChartGrid');
    if (grid) {
      let gridSvg = `<line class="vxd-baseline" x1="${padX}" y1="${zeroY}" x2="${W - padX}" y2="${zeroY}"></line>`;
      [0.5, 1].forEach(f => {
        const yA = topY + (zeroY - topY) * (1 - f);
        const yB = zeroY + (bottomY - zeroY) * f;
        gridSvg += `<line class="vxd-grid-line" x1="${padX}" y1="${yA.toFixed(1)}" x2="${W - padX}" y2="${yA.toFixed(1)}"></line>`;
        gridSvg += `<line class="vxd-grid-line" x1="${padX}" y1="${yB.toFixed(1)}" x2="${W - padX}" y2="${yB.toFixed(1)}"></line>`;
      });
      grid.innerHTML = gridSvg;
    }

    const setPath = (id, key) => {
      const el = $id(id);
      if (el) el.setAttribute('d', monotonePath(vxdPixels.map(p => p[key])));
    };
    setPath('vxdLineConfirmados', 'confirmados');
    setPath('vxdLineRecusados', 'recusados');
    setPath('vxdLineConcluidos', 'concluidos');
    // camada de glow — mesmo path da linha nítida, só borrada por trás
    setPath('vxdLineConfirmadosGlow', 'confirmados');
    setPath('vxdLineRecusadosGlow', 'recusados');
    setPath('vxdLineConcluidosGlow', 'concluidos');

    // área sombreada entre cada linha e a linha de zero (pra cima em verde/roxo, pra baixo em vermelho)
    const setArea = (id, key) => {
      const el = $id(id);
      if (!el || !vxdPixels.length) return;
      const linePath = monotonePath(vxdPixels.map(p => p[key]));
      const last = vxdPixels[vxdPixels.length - 1][key], first = vxdPixels[0][key];
      el.setAttribute('d', `${linePath} L${last.x.toFixed(1)},${zeroY} L${first.x.toFixed(1)},${zeroY} Z`);
    };
    setArea('vxdAreaConfirmados', 'confirmados');
    setArea('vxdAreaRecusados', 'recusados');
    setArea('vxdAreaConcluidos', 'concluidos');

    // ponto "vivo" fixo na ponta de cada linha (valor acumulado atual) — sem badge, só o ponto pulsando
    posicionarPontasVxd();

    const labelsHost = $id('vxdChartLabels');
    if (labelsHost) labelsHost.innerHTML = pontos.map(p => `<span>${p.label}</span>`).join('');

    initVxdHover(); // idempotente — só liga os listeners na primeira vez
    esconderVxdHover();
  }

  function posicionarPontasVxd() {
    if (!vxdPixels.length) return;
    const last = vxdPixels[vxdPixels.length - 1];
    const pares = [
      ['confirmados', 'vxdTipConfirmados', 'vxdTipPulseConfirmados'],
      ['recusados', 'vxdTipRecusados', 'vxdTipPulseRecusados'],
      ['concluidos', 'vxdTipConcluidos', 'vxdTipPulseConcluidos']
    ];
    pares.forEach(([key, tipId, pulseId]) => {
      const pt = last[key];
      const tip = $id(tipId), pulse = $id(pulseId);
      if (tip) { tip.setAttribute('cx', pt.x.toFixed(1)); tip.setAttribute('cy', pt.y.toFixed(1)); }
      if (pulse) { pulse.setAttribute('cx', pt.x.toFixed(1)); pulse.setAttribute('cy', pt.y.toFixed(1)); }
    });
  }

  function esconderVxdHover() {
    const grp = $id('vxdHoverGroup'), tip = $id('vxdChartTooltip');
    if (grp) grp.style.display = 'none';
    if (tip) tip.style.display = 'none';
  }

  function initVxdHover() {
    const capture = $id('vxdHoverCapture');
    if (!capture || capture.dataset.vxdBound) return;
    capture.dataset.vxdBound = '1';
    const svg = $id('vxdChartSvg');
    const body = $id('vxdChartBody');
    const grp = $id('vxdHoverGroup');
    const tip = $id('vxdChartTooltip');

    capture.addEventListener('mousemove', (ev) => {
      if (!vxdPixels.length || !svg || !body) return;
      const rect = svg.getBoundingClientRect();
      const fracX = (ev.clientX - rect.left) / rect.width;
      const viewBoxX = fracX * 640;
      const step = vxdPixels.length > 1 ? (vxdPixels[1].x - vxdPixels[0].x) : 1;
      let idx = Math.round((viewBoxX - vxdPixels[0].x) / (step || 1));
      idx = Math.max(0, Math.min(vxdPixels.length - 1, idx));

      const px = vxdPixels[idx], pt = vxdPontos[idx];
      if (!px || !pt) return;

      $id('vxdHoverLine').setAttribute('x1', px.x.toFixed(1));
      $id('vxdHoverLine').setAttribute('x2', px.x.toFixed(1));
      $id('vxdDotConfirmados').setAttribute('cx', px.confirmados.x.toFixed(1));
      $id('vxdDotConfirmados').setAttribute('cy', px.confirmados.y.toFixed(1));
      $id('vxdDotRecusados').setAttribute('cx', px.recusados.x.toFixed(1));
      $id('vxdDotRecusados').setAttribute('cy', px.recusados.y.toFixed(1));
      $id('vxdDotConcluidos').setAttribute('cx', px.concluidos.x.toFixed(1));
      $id('vxdDotConcluidos').setAttribute('cy', px.concluidos.y.toFixed(1));
      if (grp) grp.style.display = '';

      $id('vxdTooltipDate').textContent = pt.full || pt.label || '';
      $id('vxdTooltipConfirmados').textContent = pt.confirmados;
      $id('vxdTooltipRecusados').textContent = pt.recusados;
      $id('vxdTooltipConcluidos').textContent = pt.concluidos;
      if (tip) {
        const bodyRect = body.getBoundingClientRect();
        const leftPx = (px.x / 640) * bodyRect.width;
        const topPx = (Math.min(px.confirmados.y, px.recusados.y, px.concluidos.y) / 220) * bodyRect.height;
        tip.style.left = leftPx + 'px';
        tip.style.top = topPx + 'px';
        tip.style.display = '';
        // se o ponto está perto do topo, o tooltip (que normalmente abre PRA CIMA) pode
        // encostar no cabeçalho do card — nesse caso ele abre pra baixo do ponto.
        const tipHeight = tip.offsetHeight || 0;
        tip.classList.toggle('is-below', topPx - tipHeight - 14 < 0);
      }
    });
    capture.addEventListener('mouseleave', esconderVxdHover);
  }

  function setVxdChartPeriod(period) {
    vxdPeriod = period;
    document.querySelectorAll('.vxd-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    renderVxdChart();
  }
  window.setVxdChartPeriod = setVxdChartPeriod;

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

  /* ---------- Serviços em alta (dados reais: contagem de agendamentos do mês por serviço) ---------- */
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

  /* ---------- Donut (mesmos 3 segmentos reais de status) ---------- */
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
