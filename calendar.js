/* ═══════════════════════════════════════
   FLATPICKR — DATA
═══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {

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

    /* ═══════════════════════════════════════
       TIME PICKER PREMIUM — DRUM SCROLL
    ═══════════════════════════════════════ */

    // Cria o HTML do picker
    const overlay = document.createElement("div");
    overlay.className = "tp-overlay";
    overlay.innerHTML = `
        <div class="tp-sheet" id="tpSheet">
            <div class="tp-handle"></div>
            <div class="tp-title">Selecionar horário</div>
            <div class="tp-drums">
                <div class="tp-drum-wrap">
                    <div class="tp-selector"></div>
                    <div class="tp-drum" id="tpHourDrum"></div>
                </div>
                <div class="tp-sep">:</div>
                <div class="tp-drum-wrap">
                    <div class="tp-selector"></div>
                    <div class="tp-drum" id="tpMinDrum"></div>
                </div>
            </div>
            <div class="tp-actions">
                <button class="tp-btn-cancel" id="tpCancel">Cancelar</button>
                <button class="tp-btn-ok" id="tpOk">Confirmar ✓</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    let currentInput = null;
    let hourIndex = 12;
    let minIndex = 0;

    const ITEM_H = 52;
    const PADDING = 2; // itens acima/abaixo visíveis

    function buildDrum(drum, count, pad, current) {
        drum.innerHTML = "";
        // padding top
        for (let i = 0; i < PADDING; i++) {
            const ghost = document.createElement("div");
            ghost.className = "tp-item";
            drum.appendChild(ghost);
        }
        for (let i = 0; i < count; i++) {
            const el = document.createElement("div");
            el.className = "tp-item";
            el.textContent = String(i).padStart(2, "0");
            drum.appendChild(el);
        }
        // padding bottom
        for (let i = 0; i < PADDING; i++) {
            const ghost = document.createElement("div");
            ghost.className = "tp-item";
            drum.appendChild(ghost);
        }
        scrollDrum(drum, current, false);
        updateActive(drum, current, count);
    }

    function scrollDrum(drum, index, animate) {
        const y = index * ITEM_H;
        drum.style.transition = animate ? "transform .35s cubic-bezier(.32,1,.6,1)" : "none";
        drum.style.transform = `translateY(${-y}px)`;
    }

    function updateActive(drum, index, count) {
        const items = drum.querySelectorAll(".tp-item:not(:first-child):not(:last-child)");
        // remove padding items
        const real = Array.from(drum.querySelectorAll(".tp-item")).slice(PADDING, PADDING + count);
        real.forEach((el, i) => {
            el.classList.remove("active", "near");
            const diff = Math.abs(i - index);
            if (diff === 0) el.classList.add("active");
            else if (diff === 1) el.classList.add("near");
        });
    }

    function attachDrum(drum, count, getIdx, setIdx) {
        let startY = 0;
        let startIdx = 0;
        let isDragging = false;

        function clamp(v) { return Math.max(0, Math.min(count - 1, v)); }

        function onStart(y) {
            isDragging = true;
            startY = y;
            startIdx = getIdx();
            drum.style.transition = "none";
        }

        function onMove(y) {
            if (!isDragging) return;
            const delta = Math.round((startY - y) / ITEM_H);
            const newIdx = clamp(startIdx + delta);
            if (newIdx !== getIdx()) {
                setIdx(newIdx);
                scrollDrum(drum, newIdx, false);
                updateActive(drum, newIdx, count);
            }
        }

        function onEnd() {
            isDragging = false;
            scrollDrum(drum, getIdx(), true);
        }

        // Mouse
        drum.addEventListener("mousedown", e => { e.preventDefault(); onStart(e.clientY); });
        window.addEventListener("mousemove", e => onMove(e.clientY));
        window.addEventListener("mouseup", onEnd);

        // Touch
        drum.addEventListener("touchstart", e => { onStart(e.touches[0].clientY); }, { passive: true });
        drum.addEventListener("touchmove", e => { e.preventDefault(); onMove(e.touches[0].clientY); }, { passive: false });
        drum.addEventListener("touchend", onEnd);

        // Wheel
        drum.addEventListener("wheel", e => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1 : -1;
            const newIdx = clamp(getIdx() + delta);
            setIdx(newIdx);
            scrollDrum(drum, newIdx, true);
            updateActive(drum, newIdx, count);
        }, { passive: false });
    }

    function openPicker(input) {
        currentInput = input;
        const val = input.value || "12:00";
        const parts = val.split(":");
        hourIndex = parseInt(parts[0]) || 0;
        minIndex  = Math.round((parseInt(parts[1]) || 0) / 5) * 5;
        if (minIndex >= 60) minIndex = 55;

        const hDrum = document.getElementById("tpHourDrum");
        const mDrum = document.getElementById("tpMinDrum");

        buildDrum(hDrum, 24, 2, hourIndex);
        buildDrum(mDrum, 12, 2, minIndex / 5);

        overlay.classList.add("open");
    }

    function closePicker() {
        overlay.classList.remove("open");
        currentInput = null;
    }

    // Confirmar
    document.getElementById("tpOk").addEventListener("click", () => {
        if (!currentInput) return;
        const h = String(hourIndex).padStart(2, "0");
        const m = String((minIndex / 5) * 5).padStart(2, "0");

        // Reconstrói o minIndex corretamente
        const mDrum = document.getElementById("tpMinDrum");
        const real = Array.from(mDrum.querySelectorAll(".tp-item")).slice(PADDING, PADDING + 12);
        const activeMin = real.findIndex(el => el.classList.contains("active"));
        const finalMin = String(activeMin * 5).padStart(2, "0");

        const hDrum = document.getElementById("tpHourDrum");
        const realH = Array.from(hDrum.querySelectorAll(".tp-item")).slice(PADDING, PADDING + 24);
        const activeHour = realH.findIndex(el => el.classList.contains("active"));
        const finalHour = String(activeHour).padStart(2, "0");

        currentInput.value = `${finalHour}:${finalMin}`;
        currentInput.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
    });

    document.getElementById("tpCancel").addEventListener("click", closePicker);

    // Fechar ao clicar fora
    overlay.addEventListener("click", e => {
        if (e.target === overlay) closePicker();
    });

    // Inicializar drums com scroll
    setTimeout(() => {
        const hDrum = document.getElementById("tpHourDrum");
        const mDrum = document.getElementById("tpMinDrum");

        attachDrum(
            hDrum, 24,
            () => hourIndex,
            v => { hourIndex = v; }
        );
        attachDrum(
            mDrum, 12,
            () => Math.round(minIndex / 5),
            v => { minIndex = v * 5; }
        );
    }, 100);

    // Bind nos inputs de hora
    ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.setAttribute("readonly", true);
        el.style.cursor = "pointer";
        el.addEventListener("click", () => openPicker(el));
        el.addEventListener("focus", () => openPicker(el));
    });

});
