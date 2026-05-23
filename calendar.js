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

    const HOURS   = Array.from({length: 24}, (_, i) => i);
    const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

    const CELL_H = 48;
    const COL_H  = window.innerWidth <= 480 ? 190 : 220;

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

    document.body.style.overflowX = "hidden";
});
