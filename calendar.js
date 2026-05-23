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
       TIME PICKER — GRADE DE BOTÕES PREMIUM
    ══════════════════════════════════════ */

    const HOURS   = Array.from({length: 24}, (_, i) => i);
    const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    let currentInput = null;
    let selHour = 8;
    let selMin  = 0;

    // Monta HTML
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
        // scroll para hora selecionada
        const active = col.querySelector(".active");
        if (active) {
            setTimeout(() => {
                active.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 50);
        }
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
        const active = col.querySelector(".active");
        if (active) {
            setTimeout(() => {
                active.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 50);
        }
    }

    function openPicker(input) {
        currentInput = input;
        const val = input.value || "08:00";
        const parts = val.split(":");
        selHour = parseInt(parts[0]) || 8;
        const rawMin = parseInt(parts[1]) || 0;
        selMin = MINUTES.includes(rawMin) ? rawMin : 0;

        document.body.style.overflow = "hidden";
        buildHours();
        buildMins();
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
        currentInput.value = `${pad(selHour)}:${pad(selMin)}`;
        currentInput.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
    });

    document.getElementById("tpCancel").addEventListener("click", closePicker);
    overlay.addEventListener("click", e => {
        if (e.target === overlay) closePicker();
    });

    ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.setAttribute("readonly", true);
        el.style.cursor = "pointer";
        el.addEventListener("click", () => openPicker(el));
        el.addEventListener("focus", () => openPicker(el));
    });

});
