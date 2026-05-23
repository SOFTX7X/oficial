/* PATCH CLIQUES LANDING/AUTH — GARANTE BOTÕES ENTRAR/CRIAR CONTA */
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

  /* ── TIME PICKER PREMIUM ── */
  const HOURS   = Array.from({length: 24}, (_, i) => i);
  const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];
  const CELL_H  = 48;
  const COL_H   = window.innerWidth <= 480 ? 190 : 220;

  let currentInput = null;
  let selHour = 8;
  let selMin  = 0;

  /* ── CRIA OVERLAY ── */
  const overlay = document.createElement("div");
  overlay.className = "tp-overlay";
  overlay.innerHTML = `
    <div class="tp-modal">
      <div class="tp-top">
        <div class="tp-label">HORA</div>
        <div class="tp-label">MIN</div>
      </div>
      <div class="tp-body">
        <div class="tp-col" id="tpHours"></div>
        <div class="tp-divider">:</div>
        <div class="tp-col" id="tpMins"></div>
      </div>
      <div class="tp-preview-bar">
        <span class="tp-preview-time" id="tpPreview">08:00</span>
        <span class="tp-preview-label">selecionado</span>
      </div>
      <div class="tp-actions">
        <button class="tp-cancel" id="tpCancel">Cancelar</button>
        <button class="tp-ok" id="tpOk">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflowX = "hidden";

  /* ── ESTILOS INLINE DO TIME PICKER ── */
  const style = document.createElement("style");
  style.textContent = `
    .tp-top {
      display: flex;
      justify-content: space-around;
      margin-bottom: 8px;
    }
    .tp-label {
      flex: 1;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .1em;
      color: rgba(255,255,255,.4);
      text-transform: uppercase;
    }
    .tp-body {
      display: flex;
      align-items: center;
      gap: 0;
      justify-content: center;
      margin-bottom: 16px;
    }
    .tp-divider {
      font-size: 28px;
      font-weight: 700;
      color: rgba(108,124,255,.7);
      padding: 0 6px;
      margin-bottom: 4px;
    }
    .tp-col {
      flex: 1;
      height: ${COL_H}px;
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      position: relative;
      border-radius: 16px;
      background: rgba(255,255,255,.03);
    }
    .tp-col::-webkit-scrollbar { display: none; }
    .tp-col::before,
    .tp-col::after {
      content: '';
      display: block;
      height: ${(COL_H - CELL_H) / 2}px;
      pointer-events: none;
    }
    .tp-cell {
      height: ${CELL_H}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      color: rgba(255,255,255,.25);
      scroll-snap-align: center;
      cursor: pointer;
      transition: color .15s, transform .15s;
      border-radius: 12px;
      user-select: none;
    }
    .tp-cell.sel {
      color: #fff;
      transform: scale(1.18);
      background: linear-gradient(135deg,rgba(108,124,255,.22),rgba(155,89,255,.18));
    }
    .tp-preview-bar {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
      margin-bottom: 18px;
      padding: 10px 0 6px;
      border-top: 1px solid rgba(108,124,255,.12);
    }
    .tp-preview-time {
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(135deg,#6c7cff,#9b59ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: .04em;
    }
    .tp-preview-label {
      font-size: 12px;
      color: rgba(255,255,255,.35);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .tp-actions {
      display: flex;
      gap: 10px;
    }
    .tp-cancel {
      flex: 1;
      padding: 13px;
      border-radius: 14px;
      border: 1px solid rgba(108,124,255,.25);
      background: transparent;
      color: rgba(255,255,255,.6);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background .18s;
    }
    .tp-cancel:hover { background: rgba(108,124,255,.1); }
    .tp-ok {
      flex: 2;
      padding: 13px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg,#6c7cff,#9b59ff);
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(108,124,255,.4);
      transition: opacity .18s;
    }
    .tp-ok:hover { opacity: .88; }
  `;
  document.head.appendChild(style);

  /* ── RENDER COLUNAS ── */
  function pad(n) { return String(n).padStart(2, "0"); }

  function updatePreview() {
    const el = document.getElementById("tpPreview");
    if (el) el.textContent = pad(selHour) + ":" + pad(selMin);
  }

  function renderCol(colEl, items, selected, onSelect) {
    colEl.innerHTML = "";
    items.forEach(val => {
      const cell = document.createElement("div");
      cell.className = "tp-cell" + (val === selected ? " sel" : "");
      cell.textContent = pad(val);
      cell.addEventListener("click", () => {
        onSelect(val);
        renderCol(colEl, items, val, onSelect);
        scrollToSelected(colEl, val, items);
        updatePreview();
      });
      colEl.appendChild(cell);
    });
  }

  function scrollToSelected(colEl, val, items) {
    const idx = items.indexOf(val);
    if (idx < 0) return;
    const target = idx * CELL_H - (COL_H - CELL_H) / 2;
    colEl.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }

  function snapOnScrollEnd(colEl, items, getCurrent, setCurrent, onDone) {
    let timer;
    colEl.addEventListener("scroll", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const idx = Math.round((colEl.scrollTop + (COL_H - CELL_H) / 2) / CELL_H);
        const clamped = Math.max(0, Math.min(idx, items.length - 1));
        const val = items[clamped];
        if (val !== getCurrent()) {
          setCurrent(val);
          renderCol(colEl, items, val, onDone);
          updatePreview();
        }
      }, 80);
    }, { passive: true });
  }

  /* ── ABRIR / FECHAR ── */
  function openTP(input) {
    currentInput = input;
    const raw = (input.value || "08:00").split(":");
    selHour = parseInt(raw[0]) || 8;
    selMin  = MINUTES.includes(parseInt(raw[1])) ? parseInt(raw[1]) : 0;

    const hCol = document.getElementById("tpHours");
    const mCol = document.getElementById("tpMins");

    renderCol(hCol, HOURS,   selHour, v => { selHour = v; });
    renderCol(mCol, MINUTES, selMin,  v => { selMin  = v; });

    snapOnScrollEnd(hCol, HOURS,   () => selHour, v => { selHour = v; }, v => { selHour = v; });
    snapOnScrollEnd(mCol, MINUTES, () => selMin,  v => { selMin  = v; }, v => { selMin  = v; });

    updatePreview();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      scrollToSelected(hCol, selHour, HOURS);
      scrollToSelected(mCol, selMin,  MINUTES);
    }, 60);
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

  /* ── EVENTOS ── */
  document.getElementById("tpCancel").addEventListener("click", closeTP);
  document.getElementById("tpOk").addEventListener("click", confirmTP);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeTP();
  });

  /* ── BIND NOS INPUTS DE HORA ── */
  ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.readOnly = true;
    el.style.cursor = "pointer";
    el.addEventListener("click", () => openTP(el));
    el.addEventListener("focus", () => openTP(el));
  });

});
