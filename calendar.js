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
    const CELL_H  = 44; /* altura de cada célula em px */

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

    /* ── Constrói células e retorna o col ── */
    function buildCol(colId, list, getVal, setVal, rebuild) {
        const col = document.getElementById(colId);
        col.innerHTML = "";

        /* padding para centralizar o primeiro e último item */
        const pad_el = () => {
            const s = document.createElement("div");
            s.style.cssText = `height:${(col.clientHeight / 2) - (CELL_H / 2)}px;flex-shrink:0;`;
            return s;
        };
        col.appendChild(pad_el());

        list.forEach(v => {
            const btn = document.createElement("button");
            btn.className  = "tp-cell" + (v === getVal() ? " active" : "");
            btn.textContent = pad(v);
            btn.dataset.val = v;
            btn.addEventListener("click", () => {
                setVal(v);
                rebuild();
                updatePreview();
                snapTo(col, list.indexOf(v));
            });
            col.appendChild(btn);
        });

        col.appendChild(pad_el());
        return col;
    }

    function buildHours() {
        buildCol("tpHours", HOURS, () => selHour, v => { selHour = v; }, buildHours);
        highlightActive("tpHours", HOURS, () => selHour);
    }

    function buildMins() {
        buildCol("tpMins", MINUTES, () => selMin, v => { selMin = v; }, buildMins);
        highlightActive("tpMins", MINUTES, () => selMin);
    }

    /* ── Atualiza só o highlight sem reconstruir tudo ── */
    function highlightActive(colId, list, getVal) {
        const col = document.getElementById(colId);
        col.querySelectorAll(".tp-cell").forEach((btn, i) => {
            const isActive = list[i] === getVal();
            btn.classList.toggle("active", isActive);
        });
    }

    /* ── Snapa o scroll para o índice correto ── */
    function snapTo(col, idx, animate = true) {
        const half    = col.clientHeight / 2;
        const offset  = idx * CELL_H + (CELL_H / 2) - half;
        col.scrollTo({ top: Math.max(0, offset), behavior: animate ? "smooth" : "instant" });
    }

    /* ── Após scroll livre, descobre qual item está no centro e seleciona ── */
    function getIdxFromScroll(col) {
        const half   = col.clientHeight / 2;
        const center = col.scrollTop + half;
        return Math.round((center - CELL_H / 2) / CELL_H);
    }

    /* ── WHEEL: 1 item por vez, sem pular ── */
    function attachWheel(colId, list, getVal, setVal, rebuild) {
        const col = document.getElementById(colId);
        let cooldown = false;

        col.addEventListener("wheel", e => {
            e.preventDefault();
            e.stopPropagation();

            if (cooldown) return;
            cooldown = true;
            setTimeout(() => { cooldown = false; }, 120);

            const dir  = e.deltaY > 0 ? 1 : -1;
            const cur  = getVal();
            const idx  = list.indexOf(cur);
            const next = Math.max(0, Math.min(list.length - 1, idx + dir));

            if (list[next] !== cur) {
                setVal(list[next]);
                updatePreview();
                highlightActive(colId, list, getVal);
                snapTo(col, next);
            }
        }, { passive: false });
    }

    /* ── TOUCH: scroll livre + snap no soltar ── */
    function attachTouch(colId, list, getVal, setVal, rebuild) {
        const col = document.getElementById(colId);
        let snapTimer = null;

        /* impede que o toque vaze para a página */
        col.addEventListener("touchstart", e => {
            e.stopPropagation();
            clearTimeout(snapTimer);
        }, { passive: true });

        col.addEventListener("touchmove", e => {
            e.stopPropagation();
            e.preventDefault();
        }, { passive: false });

        col.addEventListener("touchend", () => {
            /* aguarda inércia parar, depois snapa */
            snapTimer = setTimeout(() => {
                const idx  = Math.max(0, Math.min(list.length - 1, getIdxFromScroll(col)));
                const val  = list[idx];
                setVal(val);
                updatePreview();
                highlightActive(colId, list, getVal);
                snapTo(col, idx);
            }, 80);
        }, { passive: true });

        /* snap também quando o scroll para sozinho (inércia) */
        col.addEventListener("scroll", () => {
            clearTimeout(snapTimer);
            snapTimer = setTimeout(() => {
                const idx = Math.max(0, Math.min(list.length - 1, getIdxFromScroll(col)));
                const val = list[idx];
                if (val !== getVal()) {
                    setVal(val);
                    updatePreview();
                    highlightActive(colId, list, getVal);
                    snapTo(col, idx);
                }
            }, 150);
        }, { passive: true });
    }

    /* ── Bloqueia scroll do body (iOS fix) ── */
    function blockBodyScroll() {
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width    = "100%";
        document.body.style.top      = `-${window.scrollY}px`;
    }

    function unblockBodyScroll() {
        const scrollY = document.body.style.top;
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width    = "";
        document.body.style.top      = "";
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

        /* scroll inicial sem animação para posição correta */
        setTimeout(() => {
            const colH = document.getElementById("tpHours");
            const colM = document.getElementById("tpMins");
            snapTo(colH, HOURS.indexOf(selHour), false);
            snapTo(colM, MINUTES.indexOf(selMin), false);

            attachWheel("tpHours", HOURS,   () => selHour, v => { selHour = v; }, buildHours);
            attachWheel("tpMins",  MINUTES, () => selMin,  v => { selMin  = v; }, buildMins);
            attachTouch("tpHours", HOURS,   () => selHour, v => { selHour = v; }, buildHours);
            attachTouch("tpMins",  MINUTES, () => selMin,  v => { selMin  = v; }, buildMins);
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
