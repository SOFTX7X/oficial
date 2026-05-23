document.addEventListener("DOMContentLoaded", () => {

    const dateConfig = {
        locale: "pt",
        disableMobile: true,
        dateFormat: "d/m/Y",
        allowInput: false,
        clickOpens: true,
        minDate: "today",
        position: "auto center",
        onChange(selectedDates, dateStr, instance) {
            instance.close();
        }
    };

    ["#agData", "#pubData", "#reagendarData"].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) flatpickr(el, dateConfig);
    });

    const HOURS = Array.from({ length: 24 }, (_, i) => i);
    const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

    let currentInput = null;

    function pad(n){
        return String(n).padStart(2,"0");
    }

    function createTimePicker(input){

        const overlay = document.createElement("div");
        overlay.className = "tp-overlay open";

        overlay.innerHTML = `
            <div class="tp-modal">

                <div class="tp-top">
                    <div class="tp-label">HORA</div>
                    <div class="tp-label">MIN</div>
                </div>

                <div class="tp-body">

                    <div class="tp-col tp-hours"></div>

                    <div class="tp-divider">:</div>

                    <div class="tp-col tp-mins"></div>

                </div>

                <div class="tp-actions">
                    <button class="tp-cancel">Cancelar</button>
                    <button class="tp-ok">Confirmar</button>
                </div>

            </div>
        `;

        document.body.appendChild(overlay);

        const hourCol = overlay.querySelector(".tp-hours");
        const minCol  = overlay.querySelector(".tp-mins");

        let selHour = 8;
        let selMin = 0;

        HOURS.forEach(h => {

            const btn = document.createElement("button");

            btn.className = "tp-cell";
            btn.textContent = pad(h);

            btn.onclick = () => {

                selHour = h;

                hourCol.querySelectorAll(".tp-cell")
                    .forEach(el => el.classList.remove("active"));

                btn.classList.add("active");
            };

            hourCol.appendChild(btn);
        });

        MINUTES.forEach(m => {

            const btn = document.createElement("button");

            btn.className = "tp-cell";
            btn.textContent = pad(m);

            btn.onclick = () => {

                selMin = m;

                minCol.querySelectorAll(".tp-cell")
                    .forEach(el => el.classList.remove("active"));

                btn.classList.add("active");
            };

            minCol.appendChild(btn);
        });

        overlay.querySelector(".tp-ok").onclick = () => {

            input.value = `${pad(selHour)}:${pad(selMin)}`;

            overlay.remove();
        };

        overlay.querySelector(".tp-cancel").onclick = () => {
            overlay.remove();
        };

        overlay.onclick = (e) => {
            if(e.target === overlay){
                overlay.remove();
            }
        };
    }

    ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {

        const el = document.querySelector(sel);

        if(!el) return;

        el.type = "text";
        el.readOnly = true;
        el.style.cursor = "pointer";

        el.addEventListener("click", () => {
            currentInput = el;
            createTimePicker(el);
        });
    });

});
