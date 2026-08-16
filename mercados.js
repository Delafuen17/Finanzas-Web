/* ============================================================
   mercados.js — Gráfica de mercados (datos propios)
   Lee datos/mercados.json (generado por datos_mercado.py en
   GitHub Actions cada 2 horas) y dibuja la evolución en SVG.
   Sin librerías ni iframes: carga instantánea y sin popups.
   ============================================================ */

(function () {
    "use strict";

    var panel = document.getElementById("panel-mercados");
    if (!panel) return;

    var chips = document.querySelectorAll(".mercado-chip[data-clave]");
    var estado = { clave: "SPX", datos: null };

    panel.innerHTML =
        '<div class="mercados-ficha">' +
        '  <div class="mercados-cabecera">' +
        '    <div class="mercados-id">' +
        '      <div class="mercados-nombre" id="mercados-nombre">Cargando…</div>' +
        '      <div class="mercados-meta" id="mercados-meta"></div>' +
        '    </div>' +
        '    <div class="mercados-datos">' +
        '      <div class="mercados-precio" id="mercados-precio">—</div>' +
        '      <div class="mercados-cambio" id="mercados-cambio"></div>' +
        '    </div>' +
        '  </div>' +
        '  <div class="mercados-grafico" id="mercados-grafico"></div>' +
        '  <div class="mercados-pie">' +
        '    <span id="mercados-actualizado"></span>' +
        '    <span class="mercados-aviso">Datos con fines educativos · se actualizan cada 2 h</span>' +
        '  </div>' +
        '</div>';

    var nombre = panel.querySelector("#mercados-nombre");
    var meta = panel.querySelector("#mercados-meta");
    var precio = panel.querySelector("#mercados-precio");
    var cambio = panel.querySelector("#mercados-cambio");
    var grafico = panel.querySelector("#mercados-grafico");
    var actualizado = panel.querySelector("#mercados-actualizado");

    function formatoPrecio(v) {
        var decimales = v >= 10000 ? 0 : v >= 10 ? 2 : 4;
        return new Intl.NumberFormat("es-ES", { maximumFractionDigits: decimales }).format(v);
    }

    function escapar(s) {
        var d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }

    function pintar(clave) {
        var a = estado.datos.activos[clave];
        if (!a || !a.serie || !a.serie.length) {
            grafico.innerHTML = '<div class="mercados-error">No hay datos para este activo.</div>';
            return;
        }
        var serie = a.serie;
        var cierres = serie.map(function (f) { return parseFloat(f[1]); });
        var ultimo = cierres[cierres.length - 1];
        var anterior = cierres.length > 1 ? cierres[cierres.length - 2] : ultimo;
        var diff = ultimo - anterior;
        var pct = anterior ? (diff / anterior) * 100 : 0;

        nombre.textContent = a.nombre;
        meta.textContent = a.simbolo;
        precio.textContent = formatoPrecio(ultimo);
        precio.className = "mercados-precio " + (diff >= 0 ? "sube" : "baja");
        cambio.textContent = (diff >= 0 ? "▲ +" : "▼ ") + formatoPrecio(Math.abs(diff)) +
            " (" + (pct >= 0 ? "+" : "") + pct.toFixed(2) + " %)";
        cambio.className = "mercados-cambio " + (diff >= 0 ? "sube" : "baja");

        var sube = ultimo >= cierres[0];
        var color = sube ? "#27a06b" : "#d64545";

        var W = 600, H = 300, PAD = 16;
        var min = Math.min.apply(null, cierres);
        var max = Math.max.apply(null, cierres);
        var rango = (max - min) || 1;
        var n = cierres.length;

        var x = function (i) { return PAD + (i / (n - 1)) * (W - PAD * 2); };
        var y = function (v) { return H - PAD - ((v - min) / rango) * (H - PAD * 2); };

        var linea = "", area = "";
        for (var i = 0; i < n; i++) {
            linea += (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(cierres[i]).toFixed(1) + " ";
            area += (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(cierres[i]).toFixed(1) + " ";
        }
        area += "L" + x(n - 1).toFixed(1) + " " + (H - PAD) + " L" + x(0).toFixed(1) + " " + (H - PAD) + " Z";

        var rejilla = "";
        for (var g = 0; g <= 4; g++) {
            var yy = PAD + (g / 4) * (H - PAD * 2);
            var valor = max - (g / 4) * rango;
            rejilla += '<line x1="' + PAD + '" y1="' + yy.toFixed(1) + '" x2="' + (W - PAD) + '" y2="' + yy.toFixed(1) + '" stroke="#e3ece7" stroke-width="1"/>' +
                '<text x="' + (W - PAD - 2) + '" y="' + (yy - 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#5c6f66">' + formatoPrecio(valor) + "</text>";
        }

        grafico.innerHTML =
            '<svg viewBox="0 0 ' + W + " " + H + '" class="mercados-svg" role="img" aria-label="Evolución de ' + escapar(a.nombre) + '">' +
            rejilla +
            '<path d="' + area + '" fill="' + color + '" opacity="0.12"/>' +
            '<path d="' + linea + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="' + x(n - 1).toFixed(1) + '" cy="' + y(ultimo).toFixed(1) + '" r="4.5" fill="' + color + '"/>' +
            '<text x="' + PAD + '" y="' + (H - 2) + '" font-size="11" fill="#5c6f66">' + escapar(serie[0][0]) + "</text>" +
            '<text x="' + (W - PAD) + '" y="' + (H - 2) + '" text-anchor="end" font-size="11" fill="#5c6f66">' + escapar(serie[n - 1][0]) + "</text>" +
            "</svg>";
    }

    function activarChip(clave) {
        chips.forEach(function (c) { c.classList.remove("activo"); });
        var chip = panel.querySelector('[data-clave="' + clave + '"]');
        if (chip) chip.classList.add("activo");
    }

    chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            estado.clave = chip.getAttribute("data-clave");
            activarChip(estado.clave);
            if (estado.datos) pintar(estado.clave);
        });
    });

    function cargarDatos() {
        return fetch("datos/mercados.json")
            .then(function (r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            })
            .catch(function () {
                // Si la ruta relativa falla (p. ej. la página se abrió por
                // otra vía), se reintenta con la URL absoluta de la web.
                return fetch("https://delafuen17.github.io/Finanzas-Web/datos/mercados.json")
                    .then(function (r) {
                        if (!r.ok) throw new Error("HTTP " + r.status);
                        return r.json();
                    });
            });
    }

    cargarDatos()
        .then(function (json) {
            estado.datos = json;
            var fecha = new Date(json.actualizado);
            actualizado.textContent = "Actualizado: " + fecha.toLocaleString("es-ES", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
            });
            if (!json.activos || !json.activos[estado.clave]) {
                grafico.innerHTML = '<div class="mercados-error">Aún no hay datos de mercado. Se generan automáticamente en unas horas.</div>';
                return;
            }
            activarChip(estado.clave);
            pintar(estado.clave);
        })
        .catch(function (e) {
            grafico.innerHTML = '<div class="mercados-error">No se han podido cargar los datos de mercado (' +
                escapar(e && e.message ? e.message : String(e)) +
                "). Si el problema persiste, recarga la página con Cmd+Shift+R (Mac) o Ctrl+F5 (Windows) " +
                "o abre directamente <a href=\"https://delafuen17.github.io/Finanzas-Web/\">delafuen17.github.io/Finanzas-Web</a>.</div>";
        });
})();
