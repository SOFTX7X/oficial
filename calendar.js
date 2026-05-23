document.addEventListener("DOMContentLoaded", () => {

    flatpickr("input[type='date']", {

        locale: "pt",
        disableMobile: true,
        dateFormat: "d/m/Y",
        allowInput: false,
        clickOpens: true,

        onChange: function(selectedDates, dateStr, instance) {
            instance.close();
        }

    });

    flatpickr("input[type='time']", {

        locale: "pt",
        disableMobile: true,
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        minuteIncrement: 5,
        allowInput: false,
        clickOpens: true

    });

});
