// Utilidades para compartir resultados (WhatsApp, X y portapapeles).
let mensajeCompartir = "";

function definirMensaje(mensaje) {
    mensajeCompartir = mensaje;
}

function compartirWhatsApp() {
    if (!mensajeCompartir) return;
    window.open("https://wa.me/?text=" + encodeURIComponent(mensajeCompartir + " " + location.href), "_blank");
}

function compartirX() {
    if (!mensajeCompartir) return;
    window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(mensajeCompartir + " " + location.href), "_blank");
}

function copiarResultado() {
    if (!mensajeCompartir) return;
    copiarTexto(mensajeCompartir + " " + location.href, document.querySelector(".compartir-btn.copiar"));
}

// Copia la cita destacada de un artículo (el botón vive dentro de .cita).
function copiarCita(boton) {
    const cita = boton.closest(".cita");
    const texto = cita.querySelector("p").textContent.trim();
    copiarTexto(texto + " — Proyecto Finanzas " + location.href, boton);
}

function copiarTexto(texto, boton) {
    const terminar = () => {
        const original = boton.textContent;
        boton.textContent = "✓ Copiado";
        setTimeout(() => { boton.textContent = original; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(terminar).catch(() => {
            fallbackCopiar(texto);
            terminar();
        });
    } else {
        fallbackCopiar(texto);
        terminar();
    }
}

function fallbackCopiar(texto) {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
        document.execCommand("copy");
    } catch (e) { /* ignorar */ }
    area.remove();
}
