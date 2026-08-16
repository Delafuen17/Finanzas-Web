/* ============================================================
   videos.js — Explicadores animados con narración (Web Speech)
   Creador: Proyecto Finanzas
   Sin servicios externos: el "vídeo" se genera en el navegador
   (animaciones + voz en español vía Web Speech API).
   ============================================================ */

(function () {
    "use strict";

    /* ---------- Registro de vídeos ---------- */

    const VIDEOS = {};

    function registrarVideo(id, def) {
        VIDEOS[id] = def;
    }

    /* ---------- Voz en español ---------- */

    let voces = [];

    function actualizarVoces() {
        if ("speechSynthesis" in window) {
            voces = window.speechSynthesis.getVoices();
        }
    }
    if ("speechSynthesis" in window) {
        actualizarVoces();
        window.speechSynthesis.onvoiceschanged = actualizarVoces;
    }

    function hablar(texto, alTerminar) {
        if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
            alTerminar();
            return;
        }
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "es-ES";
        const voz = voces.find(function (v) { return /^es/i.test(v.lang); });
        if (voz) u.voice = voz;
        u.rate = 1.0;
        let terminado = false;
        const fin = function () {
            if (terminado) return;
            terminado = true;
            alTerminar();
        };
        u.onend = fin;
        u.onerror = fin;
        // Red de seguridad: si el navegador no lanza onend, no bloquear el vídeo.
        setTimeout(fin, texto.length * 110 + 8000);
        window.speechSynthesis.speak(u);
    }

    /* ---------- Formato ---------- */

    function formatoEntero(n) {
        return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
    }

    /* ---------- Constructor del reproductor ---------- */

    function crearVideo(id) {
        const contenedores = document.querySelectorAll('[data-video="' + id + '"]');
        if (!contenedores.length) return;
        const def = VIDEOS[id];
        if (!def) return;

        contenedores.forEach(function (contenedor) {
            const estado = {
                def: def,
                escena: 0,
                corriendo: false,
                terminado: false,
                haEmpezado: false,
                limpiar: null
            };

            contenedor.innerHTML =
                '<div class="video-ia">' +
                '  <div class="video-ia-cabecera">' +
                '    <span class="video-ia-titulo">🎬 ' + def.titulo + '</span>' +
                '    <span class="video-ia-creador">Creado por Proyecto Finanzas</span>' +
                '  </div>' +
                '  <div class="video-ia-escenario" aria-live="polite"></div>' +
                '  <p class="video-ia-subtitulo"></p>' +
                '  <div class="video-ia-progreso"><div class="video-ia-progreso-barra"></div></div>' +
                '  <div class="video-ia-controles">' +
                '    <button type="button" class="video-ia-boton video-ia-play">▶ Reproducir</button>' +
                '    <button type="button" class="video-ia-boton video-ia-reiniciar">↺ Reiniciar</button>' +
                '  </div>' +
                '</div>';

            const escenario = contenedor.querySelector(".video-ia-escenario");
            const subtitulo = contenedor.querySelector(".video-ia-subtitulo");
            const barra = contenedor.querySelector(".video-ia-progreso-barra");
            const botonPlay = contenedor.querySelector(".video-ia-play");
            const botonReiniciar = contenedor.querySelector(".video-ia-reiniciar");
            const total = def.escenas.length;

            function actualizarBoton() {
                if (estado.terminado) {
                    botonPlay.textContent = "↺ Volver a ver";
                } else if (estado.corriendo) {
                    botonPlay.textContent = "⏸ Pausar";
                } else if (estado.haEmpezado) {
                    botonPlay.textContent = "▶ Continuar";
                } else {
                    botonPlay.textContent = "▶ Reproducir";
                }
            }

            function limpiar() {
                if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                if (estado.limpiar) estado.limpiar();
                estado.limpiar = null;
            }

            function terminar() {
                limpiar();
                estado.corriendo = false;
                estado.terminado = true;
                subtitulo.textContent = "Fin. Pulsa «Volver a ver» para repetir.";
                barra.style.width = "100%";
                actualizarBoton();
            }

            function reproducirEscena(i) {
                if (!estado.corriendo) return;
                if (i >= total) {
                    terminar();
                    return;
                }
                estado.escena = i;
                const escena = def.escenas[i];

                escenario.innerHTML = "";
                estado.n = {};
                if (escena.montar) escena.montar(escenario, estado);
                subtitulo.textContent = escena.texto;

                let hablaFin = false;
                let lineaFin = false;
                let raf = null;

                const avanzar = function () {
                    if (hablaFin && lineaFin) {
                        if (raf) cancelAnimationFrame(raf);
                        reproducirEscena(i + 1);
                    }
                };

                hablar(escena.texto, function () {
                    hablaFin = true;
                    avanzar();
                });

                const inicio = performance.now();
                const duracion = escena.duracion || 5000;

                const frame = function (ahora) {
                    if (!estado.corriendo) return;
                    const t = (ahora - inicio) / 1000;
                    const progreso = Math.min(1, t / (duracion / 1000));
                    if (escena.animar) escena.animar(escenario, estado, progreso, t);
                    barra.style.width = Math.round(((i + progreso) / total) * 100) + "%";
                    if (progreso >= 1) {
                        lineaFin = true;
                        avanzar();
                        return;
                    }
                    raf = requestAnimationFrame(frame);
                };
                raf = requestAnimationFrame(frame);

                estado.limpiar = function () {
                    if (raf) cancelAnimationFrame(raf);
                };
            }

            function reproducir() {
                if (estado.terminado) {
                    estado.terminado = false;
                    estado.escena = 0;
                }
                limpiar();
                estado.corriendo = true;
                estado.haEmpezado = true;
                actualizarBoton();
                reproducirEscena(estado.escena);
            }

            function pausar() {
                estado.corriendo = false;
                limpiar();
                actualizarBoton();
            }

            function reiniciar() {
                estado.terminado = false;
                estado.escena = 0;
                reproducir();
            }

            botonPlay.addEventListener("click", function () {
                if (estado.corriendo) {
                    pausar();
                } else {
                    reproducir();
                }
            });
            botonReiniciar.addEventListener("click", reiniciar);
            actualizarBoton();
        });
    }

    /* ---------- Inicialización ---------- */

    document.addEventListener("DOMContentLoaded", function () {
        Object.keys(VIDEOS).forEach(function (id) {
            crearVideo(id);
        });
    });

    if ("speechSynthesis" in window) {
        window.addEventListener("pagehide", function () {
            window.speechSynthesis.cancel();
        });
    }

    /* ============================================================
       Ayudantes de escenario
       ============================================================ */

    function graficoBarrasHTML() {
        return '<div class="vic-grafico">' +
            '  <div class="vic-columna">' +
            '    <span class="vic-valor" data-v="simple">1.000 €</span>' +
            '    <div class="vic-barra-pista"><div class="vic-barra vic-simple" style="height:0%"></div></div>' +
            '    <span class="vic-barra-etiqueta">Interés simple</span>' +
            '  </div>' +
            '  <div class="vic-columna">' +
            '    <span class="vic-valor" data-v="comp">1.000 €</span>' +
            '    <div class="vic-barra-pista"><div class="vic-barra vic-compuesto" style="height:0%"></div></div>' +
            '    <span class="vic-barra-etiqueta">Interés compuesto</span>' +
            '  </div>' +
            '</div>';
    }

    /* ============================================================
       VÍDEO 1 · El interés compuesto
       ============================================================ */

    registrarVideo("interes-compuesto", {
        titulo: "El interés compuesto en 1 minuto",
        escenas: [
            {
                texto: "Imagina que inviertes mil euros al cinco por ciento anual durante veinte años.",
                duracion: 5500,
                montar: function (el) {
                    el.innerHTML =
                        '<div class="vic-cifra" style="font-size:3rem">1.000 €</div>' +
                        '<p class="vic-nota">5 % anual · 20 años</p>';
                },
                animar: function (el, estado, p) {
                    const cifra = el.querySelector(".vic-cifra");
                    if (cifra) cifra.style.transform = "scale(" + (0.82 + 0.18 * p) + ")";
                }
            },
            {
                texto: "Con interés simple, cada año ganas cincuenta euros fijos: el dinero crece en línea recta.",
                duracion: 6500,
                montar: function (el) {
                    el.innerHTML = graficoBarrasHTML();
                },
                animar: function (el, estado, p) {
                    const anios = p * 20;
                    const simple = 1000 + 50 * anios;
                    el.querySelector(".vic-simple").style.height = Math.min(100, (simple / 3000) * 100) + "%";
                    el.querySelector(".vic-compuesto").style.height = (1000 / 3000) * 100 + "%";
                    el.querySelector('[data-v="simple"]').textContent = formatoEntero(simple) + " €";
                    el.querySelector('[data-v="comp"]').textContent = "1.000 €";
                }
            },
            {
                texto: "Pero con interés compuesto, los intereses también generan intereses: la curva se dispara al final.",
                duracion: 7000,
                montar: function (el) {
                    el.innerHTML = graficoBarrasHTML();
                },
                animar: function (el, estado, p) {
                    const anios = 10 + p * 10;
                    const simple = 1000 + 50 * 20;
                    const comp = 1000 * Math.pow(1.05, anios);
                    el.querySelector(".vic-simple").style.height = Math.min(100, (simple / 3000) * 100) + "%";
                    el.querySelector(".vic-compuesto").style.height = Math.min(100, (comp / 3000) * 100) + "%";
                    el.querySelector('[data-v="simple"]').textContent = formatoEntero(simple) + " €";
                    el.querySelector('[data-v="comp"]').textContent = formatoEntero(comp) + " €";
                }
            },
            {
                texto: "En veinte años: dos mil euros con interés simple, frente a dos mil seiscientos cincuenta y tres con interés compuesto.",
                duracion: 7000,
                montar: function (el) {
                    el.innerHTML = graficoBarrasHTML();
                },
                animar: function (el, estado, p) {
                    const simple = 2000;
                    const comp = 1000 * Math.pow(1.05, 20);
                    const pulso = 1 + 0.04 * Math.sin(p * Math.PI * 2);
                    el.querySelector(".vic-simple").style.height = (simple / 3000) * 100 + "%";
                    el.querySelector(".vic-compuesto").style.height = Math.min(100, (comp / 3000) * 100) + "%";
                    el.querySelector(".vic-compuesto").style.transform = "scaleY(" + pulso + ")";
                    el.querySelector('[data-v="simple"]').textContent = formatoEntero(simple) + " €";
                    el.querySelector('[data-v="comp"]').textContent = formatoEntero(comp) + " €";
                }
            },
            {
                texto: "Por eso empezar pronto lo cambia todo: el tiempo es la palanca más poderosa.",
                duracion: 5500,
                montar: function (el) {
                    el.innerHTML =
                        '<div class="vic-cifra">Interés sobre interés</div>' +
                        '<p class="vic-nota">El tiempo es la palanca más poderosa ⏳</p>';
                },
                animar: function (el, estado, p) {
                    const cifra = el.querySelector(".vic-cifra");
                    if (cifra) cifra.style.transform = "scale(" + (0.9 + 0.1 * p) + ")";
                }
            }
        ]
    });

    /* ============================================================
       VÍDEO 2 · La inflación
       ============================================================ */

    function escenaMonedaHTML() {
        return '<div class="vic-monedas">' +
            '  <div class="vic-moeda-bloque">' +
            '    <div class="vic-moeda" data-v="moneda">🪙</div>' +
            '    <div class="vic-valor" data-v="coinValor">100 €</div>' +
            '  </div>' +
            '  <div class="vic-cart-bloque">' +
            '    <div class="vic-cart">🛒</div>' +
            '    <div class="vic-valor" data-v="precio">100 €</div>' +
            '  </div>' +
            '</div>';
    }

    registrarVideo("inflacion", {
        titulo: "La inflación en 1 minuto",
        escenas: [
            {
                texto: "Hoy, con cien euros llenas el carrito de la compra.",
                duracion: 5000,
                montar: function (el) {
                    el.innerHTML = escenaMonedaHTML();
                },
                animar: function (el, estado, p) {
                    const moeda = el.querySelector('[data-v="moneda"]');
                    if (moeda) moeda.style.transform = "scale(" + (0.85 + 0.15 * p) + ")";
                }
            },
            {
                texto: "Con una inflación del dos por ciento, el mismo carrito cuesta más cada año.",
                duracion: 6500,
                montar: function (el) {
                    el.innerHTML = escenaMonedaHTML();
                },
                animar: function (el, estado, p) {
                    const anios = p * 10;
                    const precio = 100 * Math.pow(1.02, anios);
                    el.querySelector('[data-v="precio"]').textContent = formatoEntero(precio) + " €";
                    el.querySelector('[data-v="coinValor"]').textContent = "100 €";
                    const cart = el.querySelector(".vic-cart");
                    if (cart) cart.style.transform = "scale(" + (0.9 + 0.1 * p) + ")";
                }
            },
            {
                texto: "En diez años, esos cien euros compran bastante menos: tu dinero pierde valor.",
                duracion: 6500,
                montar: function (el) {
                    el.innerHTML = escenaMonedaHTML();
                },
                animar: function (el, estado, p) {
                    el.querySelector('[data-v="precio"]').textContent = "122 €";
                    el.querySelector('[data-v="coinValor"]').textContent = "100 €";
                    const moeda = el.querySelector('[data-v="moneda"]');
                    if (moeda) moeda.style.transform = "scale(" + (1 - 0.45 * p) + ")";
                }
            },
            {
                texto: "La defensa: no dejar el dinero parado e invertir a largo plazo, porque la bolsa históricamente supera a la inflación.",
                duracion: 7000,
                montar: function (el) {
                    el.innerHTML =
                        '<div class="vic-cifra" style="font-size:1.6rem">Dinero parado → pierde valor</div>' +
                        '<p class="vic-nota">Invertir a largo plazo es la defensa 💪</p>';
                },
                animar: function (el, estado, p) {
                    const cifra = el.querySelector(".vic-cifra");
                    if (cifra) cifra.style.opacity = String(0.5 + 0.5 * p);
                }
            }
        ]
    });

    /* ============================================================
       VÍDEO 3 · El fondo de emergencia
       ============================================================ */

    function jarraHTML() {
        return '<div class="vic-jarra-bloque">' +
            '  <div class="vic-jarra">' +
            '    <div class="vic-liquido" data-v="liquido" style="height:0%"></div>' +
            '    <div class="vic-marca" style="bottom:25%">9.000 €</div>' +
            '    <div class="vic-marca" style="bottom:50%">4.500 €</div>' +
            '  </div>' +
            '  <div class="vic-jarra-info">' +
            '    <div class="vic-valor" data-v="jarraValor">0 €</div>' +
            '    <div class="vic-nota" data-v="jarraNota">gastos: 1.500 €/mes</div>' +
            '  </div>' +
            '</div>';
    }

    registrarVideo("fondo-emergencia", {
        titulo: "El fondo de emergencia en 1 minuto",
        escenas: [
            {
                texto: "El fondo de emergencia es dinero guardado para imprevistos: una avería, una factura inesperada o quedarte sin trabajo.",
                duracion: 6500,
                montar: function (el) {
                    el.innerHTML =
                        '<div class="vic-cifra" style="font-size:2.4rem">🛟 Tu red de seguridad</div>' +
                        '<p class="vic-nota">Imprevistos: averías, facturas, desempleo</p>';
                },
                animar: function (el, estado, p) {
                    const cifra = el.querySelector(".vic-cifra");
                    if (cifra) cifra.style.transform = "scale(" + (0.9 + 0.1 * p) + ")";
                }
            },
            {
                texto: "La regla: guarda de tres a seis meses de tus gastos.",
                duracion: 5000,
                montar: function (el) {
                    el.innerHTML = jarraHTML();
                    el.querySelector('[data-v="jarraValor"]').textContent = "3 – 6 meses";
                    el.querySelector('[data-v="jarraNota"]').textContent = "de tus gastos";
                },
                animar: function (el, estado, p) {
                    el.querySelector('[data-v="liquido"]').style.height = (5 + 8 * p) + "%";
                }
            },
            {
                texto: "Si gastas mil quinientos euros al mes, necesitas entre cuatro mil quinientos y nueve mil euros.",
                duracion: 7000,
                montar: function (el) {
                    el.innerHTML = jarraHTML();
                },
                animar: function (el, estado, p) {
                    const cantidad = 4500 + 4500 * p;
                    el.querySelector('[data-v="liquido"]').style.height = (50 + 50 * p) + "%";
                    el.querySelector('[data-v="jarraValor"]').textContent = formatoEntero(cantidad) + " €";
                }
            },
            {
                texto: "Ve llenándolo poco a poco, mes a mes, antes de empezar a invertir. Es tu red de seguridad.",
                duracion: 7000,
                montar: function (el) {
                    el.innerHTML = jarraHTML();
                },
                animar: function (el, estado, p) {
                    const meses = p * 30;
                    const cantidad = meses * 300;
                    el.querySelector('[data-v="liquido"]').style.height = (meses / 30) * 100 + "%";
                    el.querySelector('[data-v="jarraValor"]').textContent = formatoEntero(cantidad) + " €";
                    el.querySelector('[data-v="jarraNota"]').textContent = "mes " + Math.floor(meses) + " · 300 €/mes";
                }
            }
        ]
    });

    /* ============================================================
       VÍDEO 4 · La regla 50/30/20
       ============================================================ */

    function pieHTML() {
        return '<div class="vic-pie-bloque">' +
            '  <div class="vic-pie" data-v="pie"></div>' +
            '  <div class="vic-leyenda">' +
            '    <span class="vic-ley"><i style="background:#27a06b"></i>Necesidades <b data-v="lNece"></b></span>' +
            '    <span class="vic-ley"><i style="background:#4a90b8"></i>Deseos <b data-v="lDese"></b></span>' +
            '    <span class="vic-ley"><i style="background:#e0a458"></i>Ahorro <b data-v="lAhor"></b></span>' +
            '  </div>' +
            '</div>';
    }

    const PIE_NECESIDADES = "#27a06b";
    const PIE_DESEOS = "#4a90b8";
    const PIE_AHORRO = "#e0a458";
    const PIE_VACIO = "#e3ece7";

    function pintarPie(el, gradosNece, gradosDese, gradosAhor) {
        el.querySelector('[data-v="pie"]').style.background =
            "conic-gradient(" +
            PIE_NECESIDADES + " 0deg " + gradosNece + "deg, " +
            PIE_DESEOS + " " + gradosNece + "deg " + (gradosNece + gradosDese) + "deg, " +
            PIE_AHORRO + " " + (gradosNece + gradosDese) + "deg " + (gradosNece + gradosDese + gradosAhor) + "deg, " +
            PIE_VACIO + " " + (gradosNece + gradosDese + gradosAhor) + "deg 360deg)";
    }

    registrarVideo("regla-50-30-20", {
        titulo: "La regla 50/30/20 en 1 minuto",
        escenas: [
            {
                texto: "La regla 50 30 20 divide tus ingresos netos en tres bloques.",
                duracion: 4500,
                montar: function (el) {
                    el.innerHTML = pieHTML();
                    pintarPie(el, 0, 0, 0);
                },
                animar: function (el, estado, p) {
                    const pie = el.querySelector('[data-v="pie"]');
                    if (pie) pie.style.transform = "scale(" + (0.85 + 0.15 * p) + ")";
                }
            },
            {
                texto: "Cincuenta por ciento para necesidades: vivienda, comida, transporte y facturas.",
                duracion: 6000,
                montar: function (el) {
                    el.innerHTML = pieHTML();
                    el.querySelector('[data-v="lNece"]').textContent = "50 %";
                },
                animar: function (el, estado, p) {
                    pintarPie(el, 180 * p, 0, 0);
                }
            },
            {
                texto: "Treinta por ciento para deseos: ocio, viajes y caprichos.",
                duracion: 5500,
                montar: function (el) {
                    el.innerHTML = pieHTML();
                    el.querySelector('[data-v="lNece"]').textContent = "50 %";
                    el.querySelector('[data-v="lDese"]').textContent = "30 %";
                },
                animar: function (el, estado, p) {
                    pintarPie(el, 180, 108 * p, 0);
                }
            },
            {
                texto: "Y veinte por ciento para ahorro e inversión: tu futuro.",
                duracion: 5000,
                montar: function (el) {
                    el.innerHTML = pieHTML();
                    el.querySelector('[data-v="lNece"]').textContent = "50 %";
                    el.querySelector('[data-v="lDese"]').textContent = "30 %";
                    el.querySelector('[data-v="lAhor"]').textContent = "20 %";
                },
                animar: function (el, estado, p) {
                    pintarPie(el, 180, 108, 72 * p);
                }
            },
            {
                texto: "Con dos mil euros al mes: mil para necesidades, seiscientos para deseos y cuatrocientos para ahorrar.",
                duracion: 7000,
                montar: function (el) {
                    el.innerHTML = pieHTML();
                    pintarPie(el, 180, 108, 72);
                    el.querySelector('[data-v="lNece"]').textContent = "1.000 €";
                    el.querySelector('[data-v="lDese"]').textContent = "600 €";
                    el.querySelector('[data-v="lAhor"]').textContent = "400 €";
                },
                animar: function (el, estado, p) {
                    const pie = el.querySelector('[data-v="pie"]');
                    if (pie) pie.style.transform = "scale(" + (0.94 + 0.06 * p) + ")";
                }
            }
        ]
    });

})();
