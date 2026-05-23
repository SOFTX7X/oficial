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

    /* ── TIME PICKER PREMIUM ── */

    const overlay = document.createElement("div");
    overlay.className = "tp-overlay";
    overlay.innerHTML = `
        <div class="tp-sheet" id="tpSheet">
            <div class="tp-handle"></div>
            <div class="tp-title">Selecionar horário</div>
            <div class="tp-preview" id="tpPreview">00:00</div>
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
    let hourIndex = 8;
    let minIndex  = 0; // 0..11 → *5 = minutos

    const ITEM_H  = 56;
    const PADDING = 2;
    const HOURS   = 24;
    const MIN_STEPS = 12; // 0,5,10,...55

    function pad(n) { return String(n).padStart(2, "0"); }

    function updatePreview() {
        const el = document.getElementById("tpPreview");
        if (el) el.textContent = `${pad(hourIndex)}:${pad(minIndex * 5)}`;
    }

    function buildDrum(drum, count, getValue, format) {
        drum.innerHTML = "";
        for (let i = 0; i < PADDING; i++) {
            const g = document.createElement("div");
            g.className = "tp-item tp-ghost";
            drum.appendChild(g);
        }
        for (let i = 0; i < count; i++) {
            const el = document.createElement("div");
            el.className = "tp-item";
            el.textContent = format(i);
            drum.appendChild(el);
        }
        for (let i = 0; i < PADDING; i++) {
            const g = document.createElement("div");
            g.className = "tp-item tp-ghost";
            drum.appendChild(g);
        }
    }

    function setDrumPosition(drum, index, animate) {
        drum.style.transition = animate
            ? "transform .3s cubic-bezier(.32,1,.6,1)"
            : "none";
        drum.style.transform = `translateY(${-index * ITEM_H}px)`;
    }

    function updateActiveItems(drum, index, count) {
        const items = Array.from(drum.querySelectorAll(".tp-item:not(.tp-ghost)"));
        items.forEach((el, i) => {
            el.classList.remove("active", "near", "far");
            const diff = Math.abs(i - index);
            if (diff === 0)      el.classList.add("active");
            else if (diff === 1) el.classList.add("near");
            else                 el.classList.add("far");
        });
    }

    function initDrum(drum, count, getIdx, setIdx, format) {
        buildDrum(drum, count, getIdx, format);
        setDrumPosition(drum, getIdx(), false);
        updateActiveItems(drum, getIdx(), count);

        let startY    = 0;
        let startIdx  = 0;
        let dragging  = false;
        let lastY     = 0;
        let velocity  = 0;
        let lastTime  = 0;

        function clamp(v) { return Math.max(0, Math.min(count - 1, v)); }

        function onStart(y) {
            dragging  = true;
            startY    = y;
            lastY     = y;
            startIdx  = getIdx();
            velocity  = 0;
            lastTime  = Date.now();
            drum.style.transition = "none";
        }

        function onMove(y) {
            if (!dragging) return;
            const now   = Date.now();
            velocity    = (lastY - y) / (now - lastTime + 1);
            lastY       = y;
            lastTime    = now;
            const delta = Math.round((startY - y) / ITEM_H);
            const idx   = clamp(startIdx + delta);
            setIdx(idx);
            setDrumPosition(drum, idx, false);
            updateActiveItems(drum, idx, count);
            updatePreview();
        }

        function onEnd() {
            if (!dragging) return;
            dragging = false;
            // momentum
            const momentum = Math.round(velocity * 4);
            const idx = clamp(getIdx() + momentum);
            setIdx(idx);
            setDrumPosition(drum, idx, true);
            updateActiveItems(drum, idx, count);
            updatePreview();
        }

        // Mouse
        drum.addEventListener("mousedown", e => { e.preventDefault(); onStart(e.clientY); });
        window.addEventListener("mousemove", e => { if (dragging) onMove(e.clientY); });
        window.addEventListener("mouseup", onEnd);

        // Touch — preventDefault para impedir scroll da página
        drum.addEventListener("touchstart", e => {
            onStart(e.touches[0].clientY);
        }, { passive: true });

        drum.addEventListener("touchmove", e => {
            e.preventDefault(); // BLOQUEIA scroll da página
            onMove(e.touches[0].clientY);
        }, { passive: false });

        drum.addEventListener("touchend", onEnd);

        // Wheel
        drum.addEventListener("wheel", e => {
            e.preventDefault();
            const idx = clamp(getIdx() + (e.deltaY > 0 ? 1 : -1));
            setIdx(idx);
            setDrumPosition(drum, idx, true);
            updateActiveItems(drum, idx, count);
            updatePreview();
        }, { passive: false });
    }

    function openPicker(input) {
        currentInput = input;
        const val  = input.value || "08:00";
        const parts = val.split(":");
        hourIndex = parseInt(parts[0]) || 8;
        const rawMin = parseInt(parts[1]) || 0;
        minIndex = Math.round(rawMin / 5);
        if (minIndex >= MIN_STEPS) minIndex = MIN_STEPS - 1;

        // Bloqueia scroll do body
        document.body.style.overflow = "hidden";

        const hDrum = document.getElementById("tpHourDrum");
        const mDrum = document.getElementById("tpMinDrum");

        initDrum(hDrum, HOURS,
            () => hourIndex,
            v  => { hourIndex = v; },
            i  => pad(i)
        );
        initDrum(mDrum, MIN_STEPS,
            () => minIndex,
            v  => { minIndex = v; },
            i  => pad(i * 5)
        );

        updatePreview();
        overlay.classList.add("open");
    }

    function closePicker() {
        overlay.classList.remove("open");
        document.body.style.overflow = "";
        currentInput = null;
    }

    document.getElementById("tpOk").addEventListener("click", () => {
        if (!currentInput) return;
        currentInput.value = `${pad(hourIndex)}:${pad(minIndex * 5)}`;
        currentInput.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
    });

    document.getElementById("tpCancel").addEventListener("click", closePicker);
    overlay.addEventListener("click", e => { if (e.target === overlay) closePicker(); });

    // Bind inputs de hora
    ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.setAttribute("readonly", true);
        el.style.cursor = "pointer";
        el.addEventListener("click",  () => openPicker(el));
        el.addEventListener("focus",  () => openPicker(el));
    });

});
