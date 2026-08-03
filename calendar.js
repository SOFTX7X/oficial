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
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    allowInput: false,
    clickOpens: true,
    onChange(selectedDates, dateStr, instance) {
      instance.close();
    }
  };

  /* ══════════════════════════════════════
     TIME PICKER — RODINHA INFINITA
     Igual alarme Android — celular e PC
  ══════════════════════════════════════ */

  const HOURS   = Array.from({length: 24}, (_, i) => i);
  const MINUTES = Array.from({length: 60}, (_, i) => i);
  const CELL_H  = 56;
  const VISIBLE = 5;
  const COL_H   = CELL_H * VISIBLE;
  const REPEAT  = 40;

  let currentInput = null;
  let selHour = 8;
  let selMin  = 0;

  /* ── ESTILOS ── */
  const style = document.createElement("style");
  style.textContent = `
    .tp-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.85);
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
      -webkit-user-select: none;
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
      touch-action: none;
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
      background: linear-gradient(to bottom, #0e0e1c 0%, rgba(14,14,28,0) 100%);
    }
    .tp-col-wrap::after {
      bottom: 0;
      background: linear-gradient(to top, #0e0e1c 0%, rgba(14,14,28,0) 100%);
    }
    .tp-col-inner {
      position: absolute;
      left: 0; right: 0;
      will-change: top;
    }
    .tp-cell {
      height: ${CELL_H}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      color: rgba(255,255,255,.18);
      position: relative;
      z-index: 3;
    }
    .tp-cell.near1 { color: rgba(255,255,255,.45); font-size: 23px; }
    .tp-cell.near2 { color: rgba(255,255,255,.25); font-size: 20px; }
    .tp-cell.sel   { color: #fff; font-size: 30px; font-weight: 800; }
    .tp-divider {
      font-size: 34px;
      font-weight: 800;
      color: rgba(108,124,255,.8);
      width: 40px;
      text-align: center;
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
    .tp-actions { display: flex; gap: 10px; }
    .tp-cancel {
      flex: 1; padding: 14px; border-radius: 16px;
      border: 1px solid rgba(108,124,255,.25);
      background: transparent; color: rgba(255,255,255,.6);
      font-size: 15px; font-weight: 600; cursor: pointer;
      transition: background .18s; font-family: inherit;
    }
    .tp-cancel:hover { background: rgba(108,124,255,.12); }
    .tp-ok {
      flex: 2; padding: 14px; border-radius: 16px; border: none;
      background: linear-gradient(135deg,#6c7cff,#9b59ff);
      color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 20px rgba(108,124,255,.45);
      transition: opacity .18s, transform .1s; font-family: inherit;
    }
    .tp-ok:active { transform: scale(.97); }
  `;
  document.head.appendChild(style);

  /* ── OVERLAY HTML ── */
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
  function mod(n, m) { return ((n % m) + m) % m; }

  /* ── COLUNA INFINITA COM INÉRCIA ── */
  function makeCol(wrap, inner, items, initVal, onSelect) {
    const len = items.length;
    const total = len * REPEAT;
    const mid = Math.floor(REPEAT / 2);
    let realIdx = Math.max(0, items.indexOf(initVal));
    let absIdx  = mid * len + realIdx;

    /* build */
    inner.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const cell = document.createElement("div");
      cell.className = "tp-cell";
      cell.textContent = pad(items[mod(i, len)]);
      inner.appendChild(cell);
    }

    function topFor(idx) {
      return (COL_H / 2) - (idx * CELL_H) - (CELL_H / 2);
    }

    function setPos(idx, animated) {
      const t = topFor(idx);
      if (animated) {
        inner.style.transition = "top .22s cubic-bezier(.25,.8,.25,1)";
      } else {
        inner.style.transition = "none";
      }
      inner.style.top = t + "px";
    }

    function refreshClasses(centerAbs) {
      const cells = inner.querySelectorAll(".tp-cell");
      cells.forEach((c, i) => {
        const d = Math.abs(i - centerAbs);
        c.className = "tp-cell" +
          (d === 0 ? " sel" : d === 1 ? " near1" : d === 2 ? " near2" : "");
      });
    }

    function snapTo(idx, animated) {
      // recentra se perto das bordas
      if (idx < len * 3)               idx += len * Math.floor(REPEAT / 2);
      if (idx > total - len * 3)       idx -= len * Math.floor(REPEAT / 2);
      absIdx   = Math.max(0, Math.min(idx, total - 1));
      realIdx  = mod(absIdx, len);
      setPos(absIdx, animated);
      refreshClasses(absIdx);
      onSelect(items[realIdx]);
      updatePreview();
    }

    /* posição inicial sem animação */
    setPos(absIdx, false);
    refreshClasses(absIdx);

    /* ── DRAG COM INÉRCIA (touch + mouse) ── */
    let dragging = false;
    let startY = 0, startTop = 0;
    let lastY = 0, lastT = 0, vel = 0;
    let rafId = null;

    function onStart(y) {
      cancelAnimationFrame(rafId);
      dragging  = true;
      startY    = y;
      lastY     = y;
      lastT     = Date.now();
      vel       = 0;
      startTop  = parseFloat(inner.style.top) || topFor(absIdx);
      inner.style.transition = "none";
    }

    function onMove(y) {
      if (!dragging) return;
      const now = Date.now();
      const dt  = Math.max(1, now - lastT);
      vel   = (y - lastY) / dt;
      lastY = y;
      lastT = now;
      inner.style.top = (startTop + (y - startY)) + "px";
    }

    function onEnd() {
      if (!dragging) return;
      dragging = false;

      /* inércia */
      let curTop = parseFloat(inner.style.top);
      let v = vel * 1000; // px/s

      function glide() {
        v *= 0.92;
        curTop += v / 60;
        inner.style.top = curTop + "px";
        if (Math.abs(v) > 2) {
          rafId = requestAnimationFrame(glide);
        } else {
          /* snap ao item mais próximo */
          const idx = Math.round((topFor(0) - curTop) / CELL_H);
          snapTo(idx, true);
        }
      }
      rafId = requestAnimationFrame(glide);
    }

    /* touch */
    wrap.addEventListener("touchstart", e => {
      onStart(e.touches[0].clientY);
    }, { passive: true });

    wrap.addEventListener("touchmove", e => {
      e.preventDefault();
      onMove(e.touches[0].clientY);
    }, { passive: false });

    wrap.addEventListener("touchend", onEnd, { passive: true });
    wrap.addEventListener("touchcancel", onEnd, { passive: true });

    /* mouse */
    wrap.addEventListener("mousedown", e => {
      e.preventDefault();
      onStart(e.clientY);
      const mv = ev => onMove(ev.clientY);
      const up = () => {
        onEnd();
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
    });

    /* wheel */
    wrap.addEventListener("wheel", e => {
      e.preventDefault();
      cancelAnimationFrame(rafId);
      snapTo(absIdx + (e.deltaY > 0 ? 1 : -1), true);
    }, { passive: false });
  }

  /* ── ABRIR ── */
  function openTP(input) {
    currentInput = input;
    const raw = (input.value || "08:00").split(":");
    selHour = Math.min(23, Math.max(0, parseInt(raw[0]) || 8));
    selMin  = Math.min(59, Math.max(0, parseInt(raw[1]) || 0));

    const hWrap  = document.getElementById("tpWrapH");
    const mWrap  = document.getElementById("tpWrapM");
    const hInner = document.getElementById("tpHours");
    const mInner = document.getElementById("tpMins");

    /* recria wraps para limpar listeners antigos */
    const hNew = hWrap.cloneNode(false);
    const mNew = mWrap.cloneNode(false);
    const hIn  = document.createElement("div");
    hIn.className = "tp-col-inner"; hIn.id = "tpHours";
    const mIn  = document.createElement("div");
    mIn.className = "tp-col-inner"; mIn.id = "tpMins";
    hNew.appendChild(hIn);
    mNew.appendChild(mIn);
    hWrap.replaceWith(hNew);
    mWrap.replaceWith(mNew);

    makeCol(hNew, hIn, HOURS,   selHour, v => { selHour = v; });
    makeCol(mNew, mIn, MINUTES, selMin,  v => { selMin  = v; });

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

  /* ── BIND GLOBAL: TODOS OS CAMPOS DE DATA E HORA ── */
  function bindDateInput(el) {
    if (!el || el._flatpickr || el.dataset.vyxoraDateBound === "1") return;
    el.dataset.vyxoraDateBound = "1";

    const config = { ...dateConfig };
    if (el.id === "agData" || el.id === "reagendarData") {
      config.minDate = "today";
    }

    flatpickr(el, config);
  }

  function bindTimeInput(el) {
    if (!el || el.dataset.vyxoraTimeBound === "1") return;
    el.dataset.vyxoraTimeBound = "1";
    el.dataset.originalType = "time";
    el.type = "text";
    el.readOnly = true;
    el.inputMode = "none";
    el.autocomplete = "off";
    el.style.cursor = "pointer";

    const open = event => {
      event.preventDefault();
      openTP(el);
    };

    el.addEventListener("click", open);
    el.addEventListener("focus", open);
    el.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") open(event);
    });
  }

  function bindAllDateTimeInputs(root = document) {
    if (root.matches?.('input[type="date"]')) bindDateInput(root);
    if (root.matches?.('input[type="time"]')) bindTimeInput(root);

    root.querySelectorAll?.('input[type="date"]').forEach(bindDateInput);
    root.querySelectorAll?.('input[type="time"]').forEach(bindTimeInput);
  }

  bindAllDateTimeInputs(document);

  const dateTimeObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          bindAllDateTimeInputs(node);
        }
      });
    }
  });

  dateTimeObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

});
