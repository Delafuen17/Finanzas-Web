/* ============================================================
   mercado.js — Panel de mercados en tiempo real
   Datos: Twelve Data API (plan gratuito, 800 peticiones/día).
   La clave se inyecta en el despliegue (GitHub Actions)
   sustituyendo CLAVE_TWELVEDATA. Sin librerías externas: la
   gráfica se dibuja con SVG.
   ============================================================ */

(function () {
    "use strict";

    const API_KEY = "CLAVE_TWELVEDATA"; // se sustituye en el despliegue
    const INTERVALO_REFRESCO = 5 * 60 * 1000; // 5 minutos (respetar el plan gratis)
    const DIAS = 30;

    function claveConfigurada() {
        return API_KEY && API_KEY !== "CLAVE_TWELVEDATA" && API_KEY.length >= 8;
    }

    const ACTIVOS = [
        { simbolo: "SPX",     nombre: "S&P 500",      tipo: "Índice",       pais: "EE. UU." },
        { simbolo: "IBEX",    nombre: "IBEX 35",      tipo: "Índice",       pais: "España" },
        { simbolo: "NDX",     nombre: "Nasdaq 100",   tipo: "Índice",       pais: "EE. UU." },
        { simbolo: "DAX",     nombre: "DAX",          tipo: "Índice",       pais: "Alemania" },        { simbolo: "BTC/USD", nombre: "Bitcoin", tipo: "Criptomoneda", pais: "", cg: "bitcoin" },
        { simbolo: "ETH/USD", nombre: "Ethereum", tipo: "Criptomoneda", pais: "", cg: "ethereum" },
        { simbolo: "XAU/USD", nombre: "Oro",          tipo: "Materia prima", pais: "" },
        { simbolo: "OILWTI",  nombre: "Petróleo (WTI)", tipo: "Materia prima", pais: "" },
        { simbolo: "EUR/USD", nombre: "Euro / Dólar", tipo: "Divisa",       pais: "" }
    ];

    const panel = document.getElementById("panel-mercados");
    if (!panel) return;

    let activoActual = null;
    let datosActuales = null;

    /* ---------- Construcción del panel ---------- */

    panel.innerHTML =
        '<div class="mercado-panel">' +
        '  <div class="mercado-buscador">' +
        '    <input type="search" class="mercado-input" id="mercado-buscar" placeholder="Busca un activo (S&P 500, Bitcoin, oro…)" autocomplete="off" aria-label="Buscar activo">' +
        '    <button type="button" class="mercado-boton" id="mercado-actualizar" title="Actualizar ahora">↻ Actualizar</button>' +
        '  </div>' +
        '  <div class="mercado-resultados" id="mercado-resultados" hidden></div>' +
        '  <div class="mercado-chips" id="mercado-chips"></div>' +
        '  <div class="mercado-ficha">' +
        '    <div class="mercado-cabecera">' +
        '      <div class="mercado-id">' +
        '        <div class="mercado-nombre" id="mercado-nombre">Elige un activo arriba</div>' +
        '        <div class="mercado-meta" id="mercado-meta"></div>' +
        '      </div>' +
        '      <div class="mercado-datos">' +
        '        <div class="mercado-precio" id="mercado-precio">—</div>' +
        '        <div class="mercado-cambio" id="mercado-cambio">—</div>' +
        '      </div>' +
        '    </div>' +
        '    <div class="mercado-grafico" id="mercado-grafico"></div>' +
        '    <div class="mercado-pie">' +
        '      <span class="mercado-actualizado" id="mercado-actualizado"></span>' +
        '      <span class="mercado-aviso">Datos con retraso · uso educativo</span>' +
        '    </div>' +
        '  </div>' +
        '</div>';

    const input = panel.querySelector("#mercado-buscar");
    const resultados = panel.querySelector("#mercado-resultados");
    const chips = panel.querySelector("#mercado-chips");
    const nombre = panel.querySelector("#mercado-nombre");
    const meta = panel.querySelector("#mercado-meta");
    const precio = panel.querySelector("#mercado-precio");
    const cambio = panel.querySelector("#mercado-cambio");
    const grafico = panel.querySelector("#mercado-grafico");
    const actualizado = panel.querySelector("#mercado-actualizado");
    const botonActualizar = panel.querySelector("#mercado-actualizar");

    /* ---------- Utilidades ---------- */

    function formatoPrecio(v) {
        const decimales = v < 10 ? 4 : v < 1000 ? 2 : 1;
        return new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: decimales }).format(v);
    }

    function formatoCambio(v) {
        const decimales = v < 10 ? 2 : 2;
        return new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    }

    function escapar(s) {
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }

    /* ---------- Búsqueda ---------- */

    function filtrar(texto) {
        const q = texto.trim().toLowerCase();
        if (!q) return [];
        return ACTIVOS.filter(function (a) {
            return a.nombre.toLowerCase().indexOf(q) !== -1 ||
                   a.simbolo.toLowerCase().indexOf(q) !== -1 ||
                   a.tipo.toLowerCase().indexOf(q) !== -1;
        }).slice(0, 8);
    }

    function mostrarResultados(lista) {
        if (!lista.length) {
            resultados.hidden = true;
            return;
        }
        resultados.innerHTML = lista.map(function (a) {
            return '<button type="button" class="mercado-resultado" data-simbolo="' + escapar(a.simbolo) + '">' +
                '<span class="mercado-resultado-nombre">' + escapar(a.nombre) + '</span>' +
                '<span class="mercado-resultado-meta">' + escapar(a.simbolo) + " · " + escapar(a.tipo) + '</span>' +
                '</button>';
        }).join("");
        resultados.hidden = false;
        resultados.querySelectorAll(".mercado-resultado").forEach(function (b) {
            b.addEventListener("click", function () {
                const act = ACTIVOS.find(function (a) { return a.simbolo === b.dataset.simbolo; });
                if (act) seleccionarActivo(act);
                resultados.hidden = true;
                input.value = "";
            });
        });
    }

    input.addEventListener("input", function () {
        mostrarResultados(filtrar(input.value));
    });
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            const lista = filtrar(input.value);
            if (lista.length) {
                seleccionarActivo(lista[0]);
                resultados.hidden = true;
                input.value = "";
            }
        }
        if (e.key === "Escape") resultados.hidden = true;
    });
    document.addEventListener("click", function (e) {
        if (!panel.contains(e.target)) resultados.hidden = true;
    });

    /* ---------- Chips rápidos ---------- */

    ["SPX", "IBEX", "BTC/USD", "XAU/USD"].forEach(function (s) {
        const a = ACTIVOS.find(function (x) { return x.simbolo === s; });
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "mercado-chip";
        chip.textContent = a.nombre;
        chip.addEventListener("click", function () { seleccionarActivo(a); });
        chips.appendChild(chip);
    });

    /* ---------- Carga de datos ---------- */

    function urlDatos(activo) {
        return "https://api.twelvedata.com/time_series" +
            "?symbol=" + encodeURIComponent(activo.simbolo) +
            "&interval=1day&outputsize=" + DIAS +
            "&apikey=" + encodeURIComponent(API_KEY);
    }

    function cargarActivo(activo, silencioso) {
        if (!silencioso) mostrarCargando(activo);
        // Sin clave configurada: las cripto funcionan igual con CoinGecko (público y sin clave).
        if (!claveConfigurada()) {
            if (activo.cg) {
                cargarCoinGecko(activo);
            } else {
                mostrarError(activo, "Para ver " + activo.nombre + " se necesita la clave gratuita de Twelve Data. Añádela como secreto TWELVEDATA_API_KEY en el repo y re-despliega.");
            }
            return;
        }
        fetch(urlDatos(activo))
            .then(function (r) { return r.json(); })
            .then(function (json) {
                if (json.status !== "ok" || !json.values || !json.values.length) {
                    mostrarError(activo, json.message || "No hay datos para este activo.");
                    return;
                }
                datosActuales = json;
                // values vienen del más reciente al más antiguo; la gráfica los quiere al revés.
                pintarActivo(activo, json.values.slice().reverse());
            })
            .catch(function () {
                mostrarError(activo, "No se ha podido conectar con el proveedor de datos.");
            });
    }

    function cargarCoinGecko(activo) {
        fetch("https://api.coingecko.com/api/v3/coins/" + activo.cg + "/market_chart?vs_currency=eur&days=30&interval=daily")
            .then(function (r) { return r.json(); })
            .then(function (json) {
                if (!json.prices || !json.prices.length) {
                    mostrarError(activo, "No hay datos para este activo.");
                    return;
                }
                const filas = json.prices.map(function (p) {
                    const fecha = new Date(p[0]).toISOString().slice(0, 10);
                    return { datetime: fecha, close: p[1] };
                });
                datosActuales = filas;
                pintarActivo(activo, filas);
            })
            .catch(function () {
                mostrarError(activo, "No se ha podido conectar con el proveedor de datos.");
            });
    }

    function mostrarCargando(activo) {
        nombre.textContent = activo.nombre;
        meta.textContent = activo.simbolo + " · " + activo.tipo;
        precio.textContent = "…";
        cambio.textContent = "";
        cambio.className = "mercado-cambio";
        grafico.innerHTML = '<div class="mercado-cargando">Cargando datos…</div>';
        actualizado.textContent = "";
    }

    function mostrarError(activo, mensaje) {
        nombre.textContent = activo.nombre;
        meta.textContent = activo.simbolo + " · " + activo.tipo;
        precio.textContent = "—";
        cambio.textContent = "";
        cambio.className = "mercado-cambio";
        grafico.innerHTML = '<div class="mercado-error">' + escapar(mensaje) + "</div>";
        actualizado.textContent = "";
    }

    function seleccionarActivo(activo) {
        activoActual = activo;
        cargarActivo(activo, false);
    }

    botonActualizar.addEventListener("click", function () {
        if (activoActual) cargarActivo(activoActual, false);
    });

    /* ---------- Gráfica SVG ---------- */

    function pintarActivo(activo, filas) {
        const cierres = filas.map(function (f) { return parseFloat(f.close); });
        if (!cierres.length) return;

        const ultimo = cierres[cierres.length - 1];
        const anterior = cierres.length > 1 ? cierres[cierres.length - 2] : ultimo;
        const diff = ultimo - anterior;
        const pct = anterior ? (diff / anterior) * 100 : 0;

        nombre.textContent = activo.nombre;
        meta.textContent = activo.simbolo + " · " + activo.tipo;
        precio.textContent = formatoPrecio(ultimo);
        precio.className = "mercado-precio " + (diff >= 0 ? "sube" : "baja");
        cambio.textContent = (diff >= 0 ? "▲ +" : "▼ ") + formatoCambio(diff) + " (" + (pct >= 0 ? "+" : "") + pct.toFixed(2) + " %)";
        cambio.className = "mercado-cambio " + (diff >= 0 ? "sube" : "baja");

        const ahora = new Date();
        actualizado.textContent = "Actualizado a las " + ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        // Color según la tendencia del periodo
        const sube = ultimo >= cierres[0];
        const color = sube ? "#27a06b" : "#d64545";

        const W = 600;
        const H = 320;
        const PAD = 14;
        const min = Math.min.apply(null, cierres);
        const max = Math.max.apply(null, cierres);
        const rango = (max - min) || 1;
        const n = cierres.length;

        const x = function (i) { return PAD + (i / (n - 1)) * (W - PAD * 2); };
        const y = function (v) { return H - PAD - ((v - min) / rango) * (H - PAD * 2); };

        let linea = "";
        let area = "";
        for (let i = 0; i < n; i++) {
            linea += (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(cierres[i]).toFixed(1) + " ";
            area += (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(cierres[i]).toFixed(1) + " ";
        }
        area += "L" + x(n - 1).toFixed(1) + " " + (H - PAD) + " L" + x(0).toFixed(1) + " " + (H - PAD) + " Z";

        let rejilla = "";
        for (let i = 0; i <= 4; i++) {
            const yy = PAD + (i / 4) * (H - PAD * 2);
            const valor = max - (i / 4) * rango;
            rejilla += '<line x1="' + PAD + '" y1="' + yy.toFixed(1) + '" x2="' + (W - PAD) + '" y2="' + yy.toFixed(1) + '" stroke="#e3ece7" stroke-width="1"/>' +
                '<text x="' + (W - PAD - 2) + '" y="' + (yy - 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#5c6f66">' + formatoPrecio(valor) + "</text>";
        }

        const fechaIni = filas[0].datetime.slice(0, 10);
        const fechaFin = filas[n - 1].datetime.slice(0, 10);

        grafico.innerHTML =
            '<svg viewBox="0 0 ' + W + " " + H + '" class="mercado-svg" role="img" aria-label="Evolución de ' + escapar(activo.nombre) + ' en los últimos ' + n + " días\">" +
            rejilla +
            '<path d="' + area + '" fill="' + color + '" opacity="0.12"/>' +
            '<path d="' + linea + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="' + x(n - 1).toFixed(1) + '" cy="' + y(ultimo).toFixed(1) + '" r="4.5" fill="' + color + '"/>' +
            '<text x="' + PAD + '" y="' + (H - 2) + '" font-size="11" fill="#5c6f66">' + escapar(fechaIni) + "</text>" +
            '<text x="' + (W - PAD) + '" y="' + (H - 2) + '" text-anchor="end" font-size="11" fill="#5c6f66">' + escapar(fechaFin) + "</text>" +
            "</svg>";
    }

    /* ---------- Refresco automático ---------- */

    setInterval(function () {
        if (activoActual && datosActuales) {
            cargarActivo(activoActual, true);
        }
    }, INTERVALO_REFRESCO);

    /* ---------- Carga inicial: Bitcoin (funciona sin clave) ---------- */

    seleccionarActivo(ACTIVOS.find(function (a) { return a.simbolo === "BTC/USD"; }));
})();
