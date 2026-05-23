document.addEventListener("DOMContentLoaded", () => {

    /* ── FLATPICKR ── */
    const dateConfig = {
        locale: "pt",
        disableMobile: true,
        dateFormat: "d/m/Y",
        allowInput: false,
        clickOpens: true,
        minDate: "today",
        onChange(selectedDates, dateStr, instance) { instance.close(); }
    };
    ["#agData", "#pubData", "#reagendarData"].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) flatpickr(el, dateConfig);
    });

    /* ══════════════════════════════════════
       TIME PICKER
    ══════════════════════════════════════ */

    const HOURS   = Array.from({length: 24}, (_, i) => i);
    const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const CELL_H  = 48;

    let currentInput = null;
    let selHour = 8;
    let selMin  = 0;

    const isMobile = () => window.matchMedia("(pointer: coarse)").matches;

    /* ── Cria overlay ── */
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

    function pad(n) { return String(n).padStart(2, "0"); }

    function updatePreview() {
        document.getElementById("tpPreview").textContent = `${pad(selHour)}:${pad(selMin)}`;
    }

    /* ── Calcula índice pelo scrollTop ── */
    function idxFromScroll(col) {
        const half = col.clientHeight / 2;
        return Math.round((col.scrollTop + half - CELL_H / 2) / CELL_H);
    }

    /* ── Snapa suavemente para índice ── */
    function snapTo(col, idx, smooth) {
        const half   = col.clientHeight / 2;
        const target = Math.max(0, idx * CELL_H - half + CELL_H / 2);
        col.scrollTo({ top: target, behavior: smooth ? "smooth" : "instant" });
    }

    /* ── Constrói coluna com padding para centralizar ── */
    function buildCol(colId, list, getVal) {
        const col = document.getElementById(colId);
        col.innerHTML = "";

        const spacer = () => {
            const d = document.createElement("div");
            d.className = "tp-spacer";
            return d;
        };
        col.appendChild(spacer());

        list.forEach((v, i) => {
            const btn = document.createElement("button");
            btn.className = "tp-cell" + (v === getVal() ? " active" : "");
            btn.textContent = pad(v);
            btn.dataset.idx = i;
            col.appendChild(btn);
        });

        col.appendChild(spacer());
        return col;
    }

    function refreshHighlight(colId, list, getVal) {
        const col = document.getElementById(colId);
        col.querySelectorAll(".tp-cell").forEach((btn, i) => {
            btn.classList.toggle("active", list[i] === getVal());
        });
    }

    /* ══════════════════════════════════════
       MOBILE — scroll nativo puro com snap
    ══════════════════════════════════════ */
    function setupMobile(colId, list, getVal, setVal) {
        const col = document.getElementById(colId);
        let snapTimer = null;

        function doSnap() {
            const idx = Math.max(0, Math.min(list.length - 1, idxFromScroll(col)));
            setVal(list[idx]);
            updatePreview();
            refreshHighlight(colId, list, getVal);
            snapTo(col, idx, true);
        }

        col.addEventListener("touchstart", e => {
            e.stopPropagation();
            clearTimeout(snapTimer);
        }, { passive: true });

        col.addEventListener("touchmove", e => {
            e.stopPropagation();
            e.preventDefault();
        }, { passive: false });

        col.addEventListener("touchend", () => {
            clearTimeout(snapTimer);
            snapTimer = setTimeout(doSnap, 60);
        }, { passive: true });

        col.addEventListener("scroll", () => {
            clearTimeout(snapTimer);
            snapTimer = setTimeout(doSnap, 120);
        }, { passive: true });

        /* toque direto numa célula */
        col.addEventListener("click", e => {
            const btn = e.target.closest(".tp-cell");
            if (!btn) return;
            const idx = parseInt(btn.dataset.idx);
            setVal(list[idx]);
            updatePreview();
            refreshHighlight(colId, list, getVal);
            snapTo(col, idx, true);
        });
    }

    /* ══════════════════════════════════════
       PC — wheel 1 item por vez, sem pular
    ══════════════════════════════════════ */
    function setupDesktop(colId, list, getVal, setVal) {
        const col = document.getElementById(colId);
        let busy = false;

        col.addEventListener("wheel", e => {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;

            busy = true;
            setTimeout(() => { busy = false; }, 130);

            const dir = e.deltaY > 0 ? 1 : -1;
            const idx = list.indexOf(getVal());
            const next = Math.max(0, Math.min(list.length - 1, idx + dir));
            if (list[next] === getVal()) return;

            setVal(list[next]);
            updatePreview();
            refreshHighlight(colId, list, getVal);
            snapTo(col, next, true);
        }, { passive: false });

        /* toque/clique direto na célula */
        col.addEventListener("click", e => {
            const btn = e.target.closest(".tp-cell");
            if (!btn) return;
            const idx = parseInt(btn.dataset.idx);
            setVal(list[idx]);
            updatePreview();
            refreshHighlight(colId, list, getVal);
            snapTo(col, idx, true);
        });
    }

    /* ── Bloqueia scroll do body (iOS fix) ── */
    function blockBody() {
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width    = "100%";
        document.body.style.top      = `-${window.scrollY}px`;
    }

    function unblockBody() {
        const y = parseInt(document.body.style.top || "0") * -1;
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width    = "";
        document.body.style.top      = "";
        window.scrollTo(0, y);
    }

    /* ── Abre picker ── */
    function openPicker(input) {
        currentInput = input;
        const parts  = (input.value || "08:00").split(":");
        selHour = parseInt(parts[0]) || 8;
        const rm = parseInt(parts[1]) || 0;
        selMin  = MINUTES.includes(rm) ? rm : 0;

        blockBody();

        buildCol("tpHours", HOURS,   () => selHour);
        buildCol("tpMins",  MINUTES, () => selMin);
        updatePreview();
        overlay.classList.add("open");

        setTimeout(() => {
            const colH = document.getElementById("tpHours");
            const colM = document.getElementById("tpMins");

            snapTo(colH, HOURS.indexOf(selHour),   false);
            snapTo(colM, MINUTES.indexOf(selMin),  false);

            if (isMobile()) {
                setupMobile("tpHours", HOURS,   () => selHour, v => { selHour = v; });
                setupMobile("tpMins",  MINUTES, () => selMin,  v => { selMin  = v; });
            } else {
                setupDesktop("tpHours", HOURS,   () => selHour, v => { selHour = v; });
                setupDesktop("tpMins",  MINUTES, () => selMin,  v => { selMin  = v; });
            }
        }, 80);
    }

    function closePicker() {
        overlay.classList.remove("open");
        unblockBody();
        currentInput = null;
    }

    document.getElementById("tpOk").addEventListener("click", () => {
        if (!currentInput) return;
        currentInput.value = `${pad(selHour)}:${pad(selMin)}`;
        currentInput.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
    });

    document.getElementById("tpCancel").addEventListener("click", closePicker);
    overlay.addEventListener("click", e => { if (e.target === overlay) closePicker(); });
    overlay.addEventListener("wheel",     e => { if (e.target === overlay) e.preventDefault(); }, { passive: false });
    overlay.addEventListener("touchmove", e => { if (e.target === overlay) e.preventDefault(); }, { passive: false });

    ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.setAttribute("readonly", true);
        el.style.cursor = "pointer";
        el.addEventListener("click", () => openPicker(el));
        el.addEventListener("focus", () => openPicker(el));
    });
});
