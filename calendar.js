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
    let wheelAbort = null;

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

    const colH = document.getElementById("tpHours");
    const colM = document.getElementById("tpMins");

    function pad(n) { return String(n).padStart(2, "0"); }

    function updatePreview() {
        document.getElementById("tpPreview").textContent = `${pad(selHour)}:${pad(selMin)}`;
    }

    function getValFromScroll(col, list) {
        const half = col.clientHeight / 2;
        const idx  = Math.round((col.scrollTop + half - CELL_H / 2) / CELL_H);
        return list[Math.max(0, Math.min(list.length - 1, idx))];
    }

    function highlightCenter(col, list) {
        const half   = col.clientHeight / 2;
        const center = col.scrollTop + half;
        col.querySelectorAll(".tp-cell").forEach((btn, i) => {
            const btnCenter = CELL_H * i + CELL_H / 2;
            btn.classList.toggle("active", Math.abs(center - btnCenter) < CELL_H / 2);
        });
    }

    function scrollToIdx(col, idx, smooth) {
        /* spacer = metade da coluna, então o centro do item fica no centro da coluna */
        const half   = col.clientHeight / 2;
        const target = idx * CELL_H + CELL_H / 2 - half;
        col.scrollTo({ top: Math.max(0, target), behavior: smooth ? "smooth" : "instant" });
    }

    /* spacer dinâmico: calculado depois que o modal está visível */
    function buildCol(col, list, getVal) {
        col.innerHTML = "";

        /* spacer = metade da altura real da coluna */
        const spacerH = col.clientHeight / 2 - CELL_H / 2;

        const mkSpacer = () => {
            const d = document.createElement("div");
            d.style.cssText = `height:${spacerH}px;flex-shrink:0;width:100%;`;
            return d;
        };

        col.appendChild(mkSpacer());
        list.forEach((v, i) => {
            const btn = document.createElement("button");
            btn.className   = "tp-cell" + (v === getVal() ? " active" : "");
            btn.textContent = pad(v);
            btn.dataset.idx = i;
            col.appendChild(btn);
        });
        col.appendChild(mkSpacer());
    }

    /* ── Mobile — registrado UMA VEZ ── */
    colH.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
    colM.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
    colH.addEventListener("touchmove",  e => e.stopPropagation(), { passive: true });
    colM.addEventListener("touchmove",  e => e.stopPropagation(), { passive: true });

    colH.addEventListener("scroll", () => {
        highlightCenter(colH, HOURS);
        selHour = getValFromScroll(colH, HOURS);
        updatePreview();
    }, { passive: true });

    colM.addEventListener("scroll", () => {
        highlightCenter(colM, MINUTES);
        selMin = getValFromScroll(colM, MINUTES);
        updatePreview();
    }, { passive: true });

    /* ── Clique direto — registrado UMA VEZ ── */
    colH.addEventListener("click", e => {
        const btn = e.target.closest(".tp-cell");
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx);
        selHour = HOURS[idx];
        updatePreview();
        scrollToIdx(colH, idx, true);
        setTimeout(() => highlightCenter(colH, HOURS), 300);
    });

    colM.addEventListener("click", e => {
        const btn = e.target.closest(".tp-cell");
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx);
        selMin = MINUTES[idx];
        updatePreview();
        scrollToIdx(colM, idx, true);
        setTimeout(() => highlightCenter(colM, MINUTES), 300);
    });

    /* ── PC wheel — recriado com AbortController a cada abertura ── */
    function attachWheel() {
        if (wheelAbort) wheelAbort.abort();
        wheelAbort = new AbortController();
        const signal = wheelAbort.signal;

        let busyH = false;
        let busyM = false;

        colH.addEventListener("wheel", e => {
            e.preventDefault();
            e.stopPropagation();
            if (busyH) return;
            busyH = true;
            setTimeout(() => { busyH = false; }, 150);

            const dir  = e.deltaY > 0 ? 1 : -1;
            const idx  = HOURS.indexOf(selHour);
            const next = Math.max(0, Math.min(HOURS.length - 1, idx + dir));
            if (HOURS[next] === selHour) return;
            selHour = HOURS[next];
            updatePreview();
            scrollToIdx(colH, next, true);
            setTimeout(() => highlightCenter(colH, HOURS), 300);
        }, { passive: false, signal });

        colM.addEventListener("wheel", e => {
            e.preventDefault();
            e.stopPropagation();
            if (busyM) return;
            busyM = true;
            setTimeout(() => { busyM = false; }, 150);

            const dir  = e.deltaY > 0 ? 1 : -1;
            const idx  = MINUTES.indexOf(selMin);
            const next = Math.max(0, Math.min(MINUTES.length - 1, idx + dir));
            if (MINUTES[next] === selMin) return;
            selMin = MINUTES[next];
            updatePreview();
            scrollToIdx(colM, next, true);
            setTimeout(() => highlightCenter(colM, MINUTES), 300);
        }, { passive: false, signal });
    }

    /* ── Body lock iOS ── */
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

    function openPicker(input) {
        currentInput = input;
        const parts  = (input.value || "08:00").split(":");
        selHour = parseInt(parts[0]) || 8;
        const rm = parseInt(parts[1]) || 0;
        selMin  = MINUTES.includes(rm) ? rm : 0;

        blockBody();
        overlay.classList.add("open");

        /* aguarda o modal estar visível para pegar clientHeight correto */
        setTimeout(() => {
            buildCol(colH, HOURS,   () => selHour);
            buildCol(colM, MINUTES, () => selMin);
            updatePreview();
            scrollToIdx(colH, HOURS.indexOf(selHour),  false);
            scrollToIdx(colM, MINUTES.indexOf(selMin), false);
            highlightCenter(colH, HOURS);
            highlightCenter(colM, MINUTES);
            attachWheel();
        }, 80);
    }

    function closePicker() {
        selHour = getValFromScroll(colH, HOURS);
        selMin  = getValFromScroll(colM, MINUTES);
        if (wheelAbort) { wheelAbort.abort(); wheelAbort = null; }
        overlay.classList.remove("open");
        unblockBody();
        currentInput = null;
    }

    document.getElementById("tpOk").addEventListener("click", () => {
        if (!currentInput) return;
        selHour = getValFromScroll(colH, HOURS);
        selMin  = getValFromScroll(colM, MINUTES);
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
