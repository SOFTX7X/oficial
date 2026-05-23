document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       FLATPICKR DATA
    ========================= */

    const configData = {
        locale: "pt",
        disableMobile: true,
        dateFormat: "d/m/Y",
        minDate: "today",
        allowInput: false
    };

    ["#agData", "#pubData", "#reagendarData"].forEach(id => {

        const el = document.querySelector(id);

        if(el){
            flatpickr(el, configData);
        }
    });

    /* =========================
       TIME PICKER PREMIUM
    ========================= */

    const HOURS = Array.from({ length: 24 }, (_, i) => i);

    const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];

    function pad(n){
        return String(n).padStart(2, "0");
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

                <div class="tp-preview-bar">

                    <span class="tp-preview-time" id="tpPreview">
                        08:00
                    </span>

                    <span class="tp-preview-label">
                        selecionado
                    </span>

                </div>

                <div class="tp-actions">

                    <button class="tp-cancel">
                        Cancelar
                    </button>

                    <button class="tp-ok">
                        Confirmar
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(overlay);

        const hourCol = overlay.querySelector(".tp-hours");
        const minCol  = overlay.querySelector(".tp-mins");

        const preview = overlay.querySelector("#tpPreview");

        let selHour = 8;
        let selMin  = 0;

        if(input.value){

            const parts = input.value.split(":");

            selHour = parseInt(parts[0]) || 8;
            selMin  = parseInt(parts[1]) || 0;
        }

        function updatePreview(){

            preview.textContent =
                `${pad(selHour)}:${pad(selMin)}`;
        }

        HOURS.forEach(h => {

            const btn = document.createElement("button");

            btn.className = "tp-cell";

            btn.textContent = pad(h);

            if(h === selHour){
                btn.classList.add("active");
            }

            btn.onclick = () => {

                selHour = h;

                hourCol.querySelectorAll(".tp-cell")
                    .forEach(el => el.classList.remove("active"));

                btn.classList.add("active");

                updatePreview();
            };

            hourCol.appendChild(btn);
        });

        MINUTES.forEach(m => {

            const btn = document.createElement("button");

            btn.className = "tp-cell";

            btn.textContent = pad(m);

            if(m === selMin){
                btn.classList.add("active");
            }

            btn.onclick = () => {

                selMin = m;

                minCol.querySelectorAll(".tp-cell")
                    .forEach(el => el.classList.remove("active"));

                btn.classList.add("active");

                updatePreview();
            };

            minCol.appendChild(btn);
        });

        updatePreview();

        overlay.querySelector(".tp-ok").onclick = () => {

            input.value =
                `${pad(selHour)}:${pad(selMin)}`;

            input.dispatchEvent(
                new Event("change", { bubbles: true })
            );

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

    ["#agHora", "#pubHora", "#reagendarHora"].forEach(id => {

        const input = document.querySelector(id);

        if(!input) return;

        input.readOnly = true;

        input.addEventListener("click", () => {

            createTimePicker(input);
        });
    });

});
