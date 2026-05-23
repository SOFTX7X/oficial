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

    const timeConfig = {
        locale: "pt",
        disableMobile: true,
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        minuteIncrement: 5,
        allowInput: false,
        clickOpens: true
    };

    // Todos os campos de data
    ["#agData", "#pubData", "#reagendarData"].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) flatpickr(el, dateConfig);
    });

    // Todos os campos de hora
    ["#agHora", "#pubHora", "#reagendarHora"].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) flatpickr(el, timeConfig);
    });

});
