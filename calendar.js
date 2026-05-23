document.addEventListener("DOMContentLoaded", () => {

    /* ── FLATPICKR DATA ── */
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
       TIME PICKER PREMIUM
    ══════════════════════════════════════ */

    const HOURS   = Array.from({length: 24}, (_, i) => i);
    const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    let currentInput = null;
    let selHour = 8;
    let selMin  = 0;

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
        document.getElementById("tpPreview").textContent =
            `${pad(selHour)}:${pad(selMin)}`;
    }

    function scrollToActive(col) {
        const active = col.querySelector(".active");
        if (active) {
            setTimeout(() => {
                active.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 50);
        }
    }

    function buildHours() {
        const col = document.getElementById("tpHours");
        col.innerHTML = "";
        HOURS.forEach(h => {
            const btn = document.createElement("button");
            btn.className = "tp-cell" + (h === selHour ? " active" : "");
            btn.textContent = pad(h);
            btn.addEventListener("click", () => {
                selHour = h;
                buildHours();
                updatePreview();
            });
            col.appendChild(btn);
        });
        scrollToActive(col);
    }

    function buildMins() {
        const col = document.getElementById("tpMins");
        col.innerHTML = "";
        MINUTES.forEach(m => {
            const btn = document.createElement("button");
            btn.className = "tp-cell" + (m === selMin ? " active" : "");
            btn.textContent = pad(m);
            btn.addEventListener("click", () => {
                selMin = m;
                buildMins();
                updatePreview();
            });
            col.appendChild(btn);
        });
        scrollToActive(col);
    }

    /* ── Wheel: 1 item por vez ── */
    function attachWheel(colId, getList, getVal, setVal, rebuild) {
        const col = document.getElementById(colId);
        let accumulated = 0;
        let wheelTimer  = null;

        col.addEventListener("wheel", e => {
            e.preventDefault();
            e.stopPropagation();
            accumulated += e.deltaY;
            if (Math.abs(accumulated) >= 40) {
                const dir  = accumulated > 0 ? 1 : -1;
                accumulated = 0;
                const list = getList();
                const cur  = getVal();
                const idx  = list.indexOf(cur);
                const next = list[Math.max(0, Math.min(list.length - 1, idx + dir))];
                if (next !== cur) { setVal(next); rebuild(); updatePreview(); }
            }
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(() => { accumulated = 0; }, 200);
        }, { passive: false });
    }

    /* ── Touch: cola o col, bloqueia a página ── */
    function attachTouch(col, getList, getVal, setVal, rebuild) {
        let startY = 0;
        let lastY  = 0;
        let moved  = 0;
        let locked = false;

        col.addEventListener("touchstart", e => {
            startY = e.touches[0].clientY;
            lastY  = startY;
            moved  = 0;
            locked = false;
        }, { passive: true });

        col.addEventListener("touchmove", e => {
            const y     = e.touches[0].clientY;
            const delta = lastY - y;
            lastY = y;

            /* determina direção predominante na primeira movimentação */
            if (!locked) {
                const absX = Math.abs(e.touches[0].clientX - e.touches[0].clientX);
                const absY = Math.abs(delta);
                if (absY > 2) locked = true;
            }

            /* bloqueia scroll da página sempre que estiver no col */
            e.preventDefault();
            e.stopPropagation();

            moved += delta;

            if (Math.abs(moved) >= 44) {
                const dir  = moved > 0 ? 1 : -1;
                moved = 0;
                const list = getList();
                const cur  = getVal();
                const idx  = list.indexOf(cur);
                const next = list[Math.max(0, Math.min(list.length - 1, idx + dir))];
                if (next !== cur) { setVal(next); rebuild(); updatePreview(); }
            }
        }, { passive: false });

        col.addEventListener("touchend", () => {
            moved  = 0;
            locked = false;
        }, { passive: true });
    }

    /* ── Bloqueia scroll nativo do body no iOS ── */
    function blockBodyScroll() {
        document.body.style.overflow   = "hidden";
        document.body.style.position   = "fixed";
        document.body.style.width      = "100%";
        document.body.style.top        = `-${window.scrollY}px`;
    }

    function unblockBodyScroll() {
        const scrollY = document.body.style.top;
        document.body.style.overflow   = "";
        document.body.style.position   = "";
        document.body.style.width      = "";
        document.body.style.top        = "";
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }

    function openPicker(input) {
        currentInput = input;
        const val    = input.value || "08:00";
        const parts  = val.split(":");
        selHour = parseInt(parts[0]) || 8;
        const rawMin = parseInt(parts[1]) || 0;
        selMin  = MINUTES.includes(rawMin) ? rawMin : 0;

        blockBodyScroll();

        buildHours();
        buildMins();
        updatePreview();
        overlay.classList.add("open");

        /* Attach direto no elemento (não pelo ID) para evitar duplicatas */
        setTimeout(() => {
            const colH = document.getElementById("tpHours");
            const colM = document.getElementById("tpMins");

            attachWheel("tpHours",
                () => HOURS,   () => selHour, v => { selHour = v; }, buildHours);
            attachWheel("tpMins",
                () => MINUTES, () => selMin,  v => { selMin  = v; }, buildMins);

            attachTouch(colH,
                () => HOURS,   () => selHour, v => { selHour = v; }, buildHours);
            attachTouch(colM,
                () => MINUTES, () => selMin,  v => { selMin  = v; }, buildMins);
        }, 80);
    }

    function closePicker() {
        overlay.classList.remove("open");
        unblockBodyScroll();
        currentInput = null;
    }

    document.getElementById("tpOk").addEventListener("click", () => {
        if (!currentInput) return;
        currentInput.value = `${pad(selHour)}:${pad(selMin)}`;
        currentInput.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
    });

    document.getElementById("tpCancel").addEventListener("click", closePicker);

    overlay.addEventListener("click", e => {
        if (e.target === overlay) closePicker();
    });

    /* Bloqueia scroll no fundo do overlay */
    overlay.addEventListener("wheel",     e => { if (e.target === overlay) e.preventDefault(); }, { passive: false });
    overlay.addEventListener("touchmove", e => { if (e.target === overlay) e.preventDefault(); }, { passive: false });

    ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.setAttribute("readonly", true);
        el.style.cursor = "pointer";
        el.addEventListener("click",  () => openPicker(el));
        el.addEventListener("focus",  () => openPicker(el));
    });

});
