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
     TIME PICKER — ESTILO CELULAR PREMIUM
     Funciona igual no PC e no celular
  ══════════════════════════════════════ */

  const HOURS   = Array.from({length: 24}, (_, i) => i);
  const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];
  const CELL_H  = 56;
  const VISIBLE = 5;
  const COL_H   = CELL_H * VISIBLE;

  let currentInput = null;
  let selHour = 8;
  let selMin  = 0;

  /* ── ESTILOS ── */
  const style = document.createElement("style");
  style.textContent = `
    .tp-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.82);
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
      user-select: none;
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
      margin-bottom: 16px;
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
    .tp-lbl-div { width: 40px; }
    .tp-body {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      position: relative;
      margin-bottom: 20px;
      height: ${COL_H}px;
    }
    .tp-body::before {
      content: '';
      position: absolute;
      left: 0; right: 0;
      top: 50%;
      transform: translateY(-50%);
      height: ${CELL_H}px;
      background: rgba(108,124,255,.13);
      border-radius: 14px;
      border-top: 1px solid rgba(108,124,255,.35);
      border-bottom: 1px solid rgba(108,124,255,.35);
      pointer-events: none;
      z-index: 1;
    }
    .tp-col-wrap {
      flex: 1;
      position: relative;
      height: ${COL_H}px;
      overflow: hidden;
      cursor: ns-resize;
    }
    .tp-col-wrap::before,
    .tp-col-wrap::after {
      content: '';
      position: absolute;
      left: 0; right: 0;
      height: ${CELL_H * 1.6}px;
      z-index: 2;
      pointer-events: none;
    }
    .tp-col-wrap::before {
      top: 0;
      background: linear-gradient(to bottom, #0e0e1c 0%, rgba(14,14,28,0) 100%);
    }
    .tp-col-wrap::after {
      bottom: 0;
      background: linear-gradient(to top, #0e0e1c 0%, rgba(14,14,28,0) 100%);
    }
    .tp-col-inner {
      position: absolute;
      left: 0; right: 0;
      top: 0;
      transition: top .18s cubic-bezier(.25,.8,.25,1);
    }
    .tp-col-inner.dragging {
      transition: none;
    }
    .tp-cell {
      height: ${CELL_H}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      color: rgba(255,255,255,.18);
      transition: color .15s, font-size .15s;
      position: relative;
      z-index: 3;
    }
    .tp-cell.near1 {
      color: rgba(255,255,255,.45);
      font-size: 22px;
    }
    .tp-cell.near2 {
      color: rgba(255,255,255,.28);
      font-size: 20px;
    }
    .tp-cell.sel {
      color: #fff;
      font-size: 28px;
    }
    .tp-divider {
      font-size: 34px;
      font-weight: 800;
      color: rgba(108,124,255,.8);
      padding: 0 2px;
      position: relative;
      z-index: 5;
      width: 40px;
      text-align: center;
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
      font-size: 40px;
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
        <div class="tp-col-wrap" id="tpWrapH">
          <div class="tp-col-inner" id="tpHours"></div>
        </div>
        <div class="tp-divider">:</div>
        <div class="tp-col-wrap" id="tpWrapM">
          <div class="tp-col-inner" id="tpMins"></div>
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

  /* ── UTILS ── */
  function pad(n) { return String(n).padStart(2,"0"); }
  function updatePreview() {
    const el = document.getElementById("tpPreview");
    if (el) el.textContent = pad(selHour) + ":" + pad(selMin);
  }

  /* ── RENDER ── */
  function renderInner(inner, items, selVal) {
    inner.innerHTML = "";
    items.forEach((val, i) => {
      const cell = document.createElement("div");
      cell.className = "tp-cell";
      cell.textContent = pad(val);
      cell.dataset.val = String(val);
      inner.appendChild(cell);
    });
    updateClasses(inner, items, selVal);
  }

  function updateClasses(inner, items, selVal) {
    const cells = inner.querySelectorAll(".tp-cell");
    const selIdx = items.indexOf(selVal);
    cells.forEach((cell, i) => {
      const diff = Math.abs(i - selIdx);
      cell.className = "tp-cell" +
        (diff === 0 ? " sel" : diff === 1 ? " near1" : diff === 2 ? " near2" : "");
    });
  }

  /* ── POSICIONAR ── */
  // O centro do col-wrap é onde fica o item selecionado
  // top do inner = offset do centro - idx * CELL_H
  function idxToTop(idx) {
    return (COL_H / 2) - (idx * CELL_H) - (CELL_H / 2);
  }

  function setTop(inner, idx, animate) {
    if (!animate) inner.classList.add("dragging");
    else inner.classList.remove("dragging");
    inner.style.top = idxToTop(idx) + "px";
  }

  function clampIdx(idx, items) {
    return Math.max(0, Math.min(idx, items.length - 1));
  }

  /* ── BIND DRAG + WHEEL ── */
  function bindCol(wrap, inner, items, getVal, setVal) {
    let startY = 0;
    let startTop = 0;
    let isDragging = false;
    let lastY = 0;
    let velocity = 0;
    let lastTime = 0;
    let animFrame = null;

    function currentIdx() {
      return clampIdx(items.indexOf(getVal()), items);
    }

    function snapToIdx(idx) {
      idx = clampIdx(idx, items);
      const val = items[idx];
      setVal(val);
      setTop(inner, idx, true);
      updateClasses(inner, items, val);
      updatePreview();
    }

    function topToIdx(top) {
      return Math.round(((COL_H / 2) - (CELL_H / 2) - top) / CELL_H);
    }

    // ── TOUCH ──
    wrap.addEventListener("touchstart", e => {
      cancelAnimationFrame(animFrame);
      startY = e.touches[0].clientY;
      lastY = startY;
      lastTime = Date.now();
      velocity = 0;
      startTop = parseFloat(inner.style.top) || idxToTop(currentIdx());
      inner.classList.add("dragging");
      isDragging = true;
    }, { passive: true });

    wrap.addEventListener("touchmove", e => {
      if (!isDragging) return;
      const y = e.touches[0].clientY;
      const now = Date.now();
      velocity = (y - lastY) / (now - lastTime + 1);
      lastY = y; lastTime = now;
      const dy = y - startY;
      inner.style.top = (startTop + dy) + "px";
    }, { passive: true });

    wrap.addEventListener("touchend", () => {
      if (!isDragging) return;
      isDragging = false;
      inner.classList.remove("dragging");
      let top = parseFloat(inner.style.top);
      // Aplica inércia
      let inertia = velocity * 80;
      top += inertia;
      let idx = clampIdx(topToIdx(top), items);
      snapToIdx(idx);
    });

    // ── MOUSE DRAG ──
    wrap.addEventListener("mousedown", e => {
      e.preventDefault();
      cancelAnimationFrame(animFrame);
      startY = e.clientY;
      lastY = startY;
      lastTime = Date.now();
      velocity = 0;
      startTop = parseFloat(inner.style.top) || idxToTop(currentIdx());
      inner.classList.add("dragging");
      isDragging = true;

      function onMove(ev) {
        if (!isDragging) return;
        const now = Date.now();
        velocity = (ev.clientY - lastY) / (now - lastTime + 1);
        lastY = ev.clientY; lastTime = now;
        const dy = ev.clientY - startY;
        inner.style.top = (startTop + dy) + "px";
      }

      function onUp() {
        if (!isDragging) return;
        isDragging = false;
        inner.classList.remove("dragging");
        let top = parseFloat(inner.style.top);
        let inertia = velocity * 80;
        top += inertia;
        let idx = clampIdx(topToIdx(top), items);
        snapToIdx(idx);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    // ── MOUSE WHEEL ── (funciona perfeitamente no PC)
    wrap.addEventListener("wheel", e => {
      e.preventDefault();
      cancelAnimationFrame(animFrame);
      const dir = e.deltaY > 0 ? 1 : -1;
      const newIdx = clampIdx(currentIdx() + dir, items);
      snapToIdx(newIdx);
    }, { passive: false });

    // ── CLIQUE NA CÉLULA ──
    inner.addEventListener("click", e => {
      const cell = e.target.closest(".tp-cell");
      if (!cell) return;
      const val = parseInt(cell.dataset.val);
      if (isNaN(val)) return;
      const idx = items.indexOf(val);
      if (idx < 0) return;
      snapToIdx(idx);
    });
  }

  /* ── ABRIR ── */
  function openTP(input) {
    currentInput = input;
    const raw = (input.value || "08:00").split(":");
    selHour = Math.min(23, Math.max(0, parseInt(raw[0]) || 8));
    const rawMin = parseInt(raw[1]) || 0;
    selMin = MINUTES.includes(rawMin)
      ? rawMin
      : MINUTES.reduce((a,b) => Math.abs(b-rawMin) < Math.abs(a-rawMin) ? b : a);

    const hInner = document.getElementById("tpHours");
    const mInner = document.getElementById("tpMins");
    const hWrap  = document.getElementById("tpWrapH");
    const mWrap  = document.getElementById("tpWrapM");

    renderInner(hInner, HOURS,   selHour);
    renderInner(mInner, MINUTES, selMin);

    // Posiciona SEM animação
    setTop(hInner, HOURS.indexOf(selHour),   false);
    setTop(mInner, MINUTES.indexOf(selMin),  false);

    bindCol(hWrap, hInner, HOURS,   () => selHour, v => { selHour = v; });
    bindCol(mWrap, mInner, MINUTES, () => selMin,  v => { selMin  = v; });

    updatePreview();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

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
