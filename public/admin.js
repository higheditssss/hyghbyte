const typeSelect = document.getElementById("typeSelect");
const steamFields = document.getElementById("steamFields");
const manualFields = document.getElementById("manualFields");

typeSelect.addEventListener("change", () => {
    if (typeSelect.value === "steam") {
        steamFields.style.display = "block";
        manualFields.style.display = "none";
    } else {
        steamFields.style.display = "none";
        manualFields.style.display = "block";
    }
});
