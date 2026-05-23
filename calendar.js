/* PATCH CLIQUES LANDING/AUTH */
window.__authOpenMode = null;

window.openAuth = function(mode) {
  window.__authOpenMode = mode || 'login';
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (window.__authOpenMode === 'login') {
    if (typeof window.showLogin === 'function') window.showLogin();
  } else {
    if (typeof window.showCadastro === 'function') window.showCadastro();
  }
};

window.closeAuth = function() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

document.addEventListener("DOMContentLoaded", () => {

  /* ── FLATPICKR DATAS ── */
  const dateConfig = {
    locale: "pt",
    disableMobile: true,
    dateFormat: "d/m/Y",
    allowInput: false,
    clickOpens: true,
    minDate: "today",
    onChange(selectedDates, dateStr, instance) {
      instance.close();
    }
  };
  ["#agData", "#pubData", "#reagendarData"].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) flatpickr(el, dateConfig);
  });

  /* ══════════════════════════════════════
     TIME PICKER — ESTILO RELÓGIO CELULAR
  ══════════════════════════════════════ */

  const HOURS   = Array.from({length: 24}, (_, i) => i);
  const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];
  const CELL_H  = 52;
  const VISIBLE = 5; // células visíveis (centro = selecionado)
  const COL_H   = CELL_H * VISIBLE;

  let currentInput = null;
  let selHour = 8;
  let selMin  = 0;

  /* ── INJECT ESTILOS ── */
  const style = document.createElement("style");
  style.textContent = `
    .tp-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.80);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity .25s ease;
    }
    .tp-overlay.open {
      opacity: 1;
      pointer-events: all;
    }
    .tp-modal {
      background: #0e0e1c;
      border: 1px solid rgba(108,124,255,.30);
      border-radius: 32px;
      width: min(340px, calc(100vw - 24px));
      padding: 28px 20px 22px;
      box-shadow:
        0 40px 100px rgba(0,0,0,.8),
        0 0 0 1px rgba(108,124,255,.10),
        0 0 80px rgba(108,124,255,.15);
      transform: scale(.92) translateY(20px);
      transition: transform .32s cubic-bezier(.32,1,.6,1);
      box-sizing: border-box;
    }
    .tp-overlay.open .tp-modal {
      transform: scale(1) translateY(0);
    }
    .tp-title {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .12em;
      color: rgba(255,255,255,.35);
      text-transform: uppercase;
      margin-bottom: 18px;
    }
    .tp-body {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      position: relative;
      margin-bottom: 20px;
    }
    /* Faixa de seleção estilo iOS */
    .tp-body::before {
      content: '';
      position: absolute;
      left: 0; right: 0;
      top: 50%;
      transform: translateY(-50%);
      height: ${CELL_H}px;
      background: rgba(108,124,255,.13);
      border-radius: 14px;
      border-top: 1px solid rgba(108,124,255,.30);
      border-bottom: 1px solid rgba(108,124,255,.30);
      pointer-events: none;
      z-index: 1;
    }
    /* Fade superior e inferior estilo iOS */
    .tp-col-wrap {
      flex: 1;
      position: relative;
      height: ${COL_H}px;
    }
    .tp-col-wrap::before,
    .tp-col-wrap::after {
      content: '';
      position: absolute;
      left: 0; right: 0;
      height: ${CELL_H * 1.8}px;
      z-index: 2;
      pointer-events: none;
    }
    .tp-col-wrap::before {
      top: 0;
      background: linear-gradient(to bottom, #0e0e1c 10%, transparent 100%);
    }
    .tp-col-wrap::after {
      bottom: 0;
      background: linear-gradient(to top, #0e0e1c 10%, transparent 100%);
    }
    .tp-col {
      height: ${COL_H}px;
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding: 0;
    }
    .tp-col::-webkit-scrollbar { display: none; }
    .tp-spacer {
      height: ${CELL_H * 2}px;
    }
    .tp-cell {
      height: ${CELL_H}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 700;
      color: rgba(255,255,255,.20);
      scroll-snap-align: center;
      cursor: pointer;
      transition: color .18s, transform .18s, font-size .18s;
      user-select: none;
      position: relative;
      z-index: 3;
    }
    .tp-cell.sel {
      color: #fff;
      font-size: 30px;
    }
    .tp-cell.near {
      color: rgba(255,255,255,.55);
      font-size: 24px;
    }
    .tp-divider {
      font-size: 32px;
      font-weight: 800;
      color: rgba(108,124,255,.8);
      padding: 0 2px;
      margin-bottom: 4px;
      position: relative;
      z-index: 5;
    }
    .tp-preview-bar {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
      padding: 14px 0 16px;
      border-top: 1px solid rgba(108,124,255,.12);
      margin-bottom: 16px;
    }
    .tp-preview-time {
      font-size: 38px;
      font-weight: 800;
      background: linear-gradient(135deg,#6c7cff,#9b59ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: .04em;
      font-variant-numeric: tabular-nums;
    }
    .tp-preview-label {
      font-size: 11px;
      color: rgba(255,255,255,.30);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .1em;
    }
    .tp-labels {
      display: flex;
      margin-bottom: 6px;
    }
    .tp-lbl {
      flex: 1;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .1em;
      color: rgba(255,255,255,.30);
      text-transform: uppercase;
    }
    .tp-lbl-div { width: 36px; }
    .tp-actions {
      display: flex;
      gap: 10px;
    }
    .tp-cancel {
      flex: 1;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid rgba(108,124,255,.25);
      background: transparent;
      color: rgba(255,255,255,.6);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background .18s;
      font-family: inherit;
    }
    .tp-cancel:hover { background: rgba(108,124,255,.12); }
    .tp-ok {
      flex: 2;
      padding: 14px;
      border-radius: 16px;
      border: none;
      background: linear-gradient(135deg,#6c7cff,#9b59ff);
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(108,124,255,.45);
      transition: opacity .18s, transform .1s;
      font-family: inherit;
    }
    .tp-ok:active { transform: scale(.97); }
  `;
  document.head.appendChild(style);

  /* ── CRIA OVERLAY ── */
  const overlay = document.createElement("div");
  overlay.className = "tp-overlay";
  overlay.innerHTML = `
    <div class="tp-modal">
      <div class="tp-title">Selecionar horário</div>
      <div class="tp-labels">
        <div class="tp-lbl">Hora</div>
        <div class="tp-lbl-div"></div>
        <div class="tp-lbl">Minuto</div>
      </div>
      <div class="tp-body">
        <div class="tp-col-wrap">
          <div class="tp-col" id="tpHours"></div>
        </div>
        <div class="tp-divider">:</div>
        <div class="tp-col-wrap">
          <div class="tp-col" id="tpMins"></div>
        </div>
      </div>
      <div class="tp-preview-bar">
        <span class="tp-preview-time" id="tpPreview">08:00</span>
        <span class="tp-preview-label">selecionado</span>
      </div>
      <div class="tp-actions">
        <button class="tp-cancel" id="tpCancel">Cancelar</button>
        <button class="tp-ok" id="tpOk">Confirmar ✓</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  /* ── UTILITÁRIOS ── */
  function pad(n) { return String(n).padStart(2, "0"); }

  function updatePreview() {
    const el = document.getElementById("tpPreview");
    if (el) el.textContent = pad(selHour) + ":" + pad(selMin);
  }

  /* ── RENDER COLUNA ── */
  function renderCol(colEl, items, selected) {
    colEl.innerHTML = "";

    // Espaçador topo
    const top = document.createElement("div");
    top.className = "tp-spacer";
    colEl.appendChild(top);

    items.forEach(val => {
      const cell = document.createElement("div");
      const diff = Math.abs(items.indexOf(val) - items.indexOf(selected));
      cell.className = "tp-cell" + (val === selected ? " sel" : diff === 1 ? " near" : "");
      cell.textContent = pad(val);
      cell.dataset.val = val;
      colEl.appendChild(cell);
    });

    // Espaçador base
    const bot = document.createElement("div");
    bot.className = "tp-spacer";
    colEl.appendChild(bot);
  }

  /* ── SCROLL PARA ITEM ── */
  function scrollTo(colEl, val, items, smooth) {
    const idx = items.indexOf(val);
    if (idx < 0) return;
    const top = CELL_H * idx; // spacer já ocupa 2*CELL_H mas scroll snap cuida
    colEl.scrollTo({ top: CELL_H * idx, behavior: smooth ? "smooth" : "instant" });
  }

  /* ── ATUALIZA CLASSES AO ROLAR ── */
  function updateCellClasses(colEl, items, currentVal) {
    const cells = colEl.querySelectorAll(".tp-cell");
    cells.forEach(cell => {
      const v = parseInt(cell.dataset.val);
      const diff = Math.abs(items.indexOf(v) - items.indexOf(currentVal));
      cell.className = "tp-cell" + (v === currentVal ? " sel" : diff === 1 ? " near" : "");
    });
  }

  /* ── SNAP AO PARAR SCROLL ── */
  function bindSnap(colEl, items, getCurrent, setCurrent) {
    let timer;
    colEl.addEventListener("scroll", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const idx = Math.round(colEl.scrollTop / CELL_H);
        const clamped = Math.max(0, Math.min(idx, items.length - 1));
        const val = items[clamped];
        setCurrent(val);
        updateCellClasses(colEl, items, val);
        updatePreview();
      }, 60);
    }, { passive: true });

    // Clique direto na célula
    colEl.addEventListener("click", e => {
      const cell = e.target.closest(".tp-cell");
      if (!cell) return;
      const val = parseInt(cell.dataset.val);
      if (isNaN(val)) return;
      setCurrent(val);
      colEl.scrollTo({ top: CELL_H * items.indexOf(val), behavior: "smooth" });
      setTimeout(() => {
        updateCellClasses(colEl, items, val);
        updatePreview();
      }, 200);
    });
  }

  /* ── ABRIR ── */
  function openTP(input) {
    currentInput = input;
    const raw = (input.value || "08:00").split(":");
    selHour = Math.min(23, Math.max(0, parseInt(raw[0]) || 8));
    const rawMin = parseInt(raw[1]) || 0;
    selMin = MINUTES.includes(rawMin) ? rawMin : MINUTES.reduce((a,b) => Math.abs(b-rawMin) < Math.abs(a-rawMin) ? b : a);

    const hCol = document.getElementById("tpHours");
    const mCol = document.getElementById("tpMins");

    renderCol(hCol, HOURS, selHour);
    renderCol(mCol, MINUTES, selMin);

    bindSnap(hCol, HOURS,   () => selHour, v => { selHour = v; });
    bindSnap(mCol, MINUTES, () => selMin,  v => { selMin  = v; });

    updatePreview();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      hCol.scrollTo({ top: CELL_H * HOURS.indexOf(selHour),   behavior: "instant" });
      mCol.scrollTo({ top: CELL_H * MINUTES.indexOf(selMin),  behavior: "instant" });
    }, 30);
  }

  /* ── FECHAR / CONFIRMAR ── */
  function closeTP() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    currentInput = null;
  }

  function confirmTP() {
    if (currentInput) {
      currentInput.value = pad(selHour) + ":" + pad(selMin);
      currentInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    closeTP();
  }

  document.getElementById("tpCancel").addEventListener("click", closeTP);
  document.getElementById("tpOk").addEventListener("click", confirmTP);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeTP(); });

  /* ── BIND NOS INPUTS ── */
  ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.readOnly = true;
    el.style.cursor = "pointer";
    el.addEventListener("click", () => openTP(el));
    el.addEventListener("focus", () => openTP(el));
  });

});
