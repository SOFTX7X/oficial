document.addEventListener("DOMContentLoaded", () => {

    flatpickr("input[type='date']", {
        locale: "pt",
        disableMobile: true,
        dateFormat: "d/m/Y"
    });

    flatpickr("input[type='time']", {
        locale: "pt",
        disableMobile: true,
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true
    });

});
