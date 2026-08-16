# 🌱 Proyecto Finanzas

**Educación financiera en español, desde cero y sin humo.**

Una web sencilla para aprender a entender tu dinero y la bolsa: artículos cortos que no
duermen a nadie, calculadoras que hacen los números por ti, experimentos interactivos
que se ven mejor que mil explicaciones, y un asistente con IA para resolver dudas.
Todo gratis, sin registro y sin necesidad de saber nada de finanzas para empezar.

🔗 **Web publicada:** https://delafuen17.github.io/Finanzas-Web/

---

## ✨ Qué puedes hacer en la web

| Sección | Qué encontrarás |
|---|---|
| 📚 **Aprende** | Artículos sobre los conceptos clave: interés compuesto, inflación, fondo de emergencia, deudas, fondos indexados, impuestos, plan de pensiones, FIRE… |
| 🧮 **Calculadoras** | Interés compuesto, regla 50/30/20, planificador de deudas, fondo de emergencia, inflación y jubilación. Resultados al instante y listos para compartir. |
| 🧪 **Experimentos** | La máquina del tiempo de la bolsa (con datos reales del S&P 500), el experimento de los gemelos y el reto de las 52 semanas. |
| 🎬 **Vídeos explicativos** | Explicadores animados de ~1 minuto con narración en español, generados en el propio navegador (Web Speech API). Disponibles en los artículos principales. |
| 🤖 **Asistente de inversión** | Pregunta lo que quieras sobre finanzas, inversión y bolsa y recibe respuestas educativas (con IA Gemini). *No es un asesor financiero.* |
| 📈 **Mercados en tiempo real** | Gráfica propia (SVG) con 13 activos seleccionables (S&P 500, IBEX 35, Nasdaq 100, DAX, Euro Stoxx 50, Nikkei 225, FTSE 100, CAC 40, Bitcoin, Ethereum, Oro, Plata y Petróleo Brent), interactiva al pasar el ratón. Los datos se descargan solos cada 2 horas (yfinance + GitHub Actions). |
| 🎯 **Test y perfil** | ¿Cuánto sabes de finanzas? y ¿qué perfil de inversor eres? Con resultados compartibles. |
| 📖 **Glosario** | Más de 30 términos financieros explicados sin tecnicismos, con buscador. |
| 📬 **Newsletter** | Contenido mensual sencillo sobre inversión y finanzas, sin spam (EmailOctopus). |

## 🛠️ Cómo está hecha

- **100 % HTML + CSS + JavaScript** estático: sin servidores, sin bases de datos, sin dependencias.
- **GitHub Pages** como hosting, con la **CDN global de GitHub** (carga media < 50 ms).
- **GitHub Actions** para el despliegue automático al hacer `push` a `main`.
- **IA**: la clave de la API de Gemini se inyecta en el despliegue desde un secreto del repo
  (`GEMINI_API_KEY`), nunca se sube al repositorio.
- **SEO**: sitemap, robots.txt, datos estructurados (Article, FAQ, WebSite), Open Graph,
  canónicas y enlazado interno entre artículos.

## 📁 Estructura

```
├── index.html                 # Portada
├── aprende.html               # Hub de artículos
├── herramientas.html          # Hub de herramientas
├── glosario.html              # Glosario con buscador
├── asistente.html             # Asistente de IA (Gemini)
├── *.html                     # Artículos y calculadoras
├── style.css                  # Estilos de toda la web
├── compartir.js               # Botones de compartir y copiar citas
├── videos.js                  # Motor de vídeos animados con narración
├── mercados.js                # Gráfica de mercados (lee datos/mercados.json)
├── datos_mercado.py           # Scraper que descarga los datos (yfinance)
├── datos/mercados.json        # Datos de mercado generados automáticamente
├── favicon.svg / og-image.png # Marca e imagen social
├── sitemap.xml / robots.txt   # SEO
├── .github/workflows/pages.yml# Despliegue automático
└── .github/workflows/datos.yml# Actualiza los datos cada 2 horas
```

## 🚀 Trabajar en local y publicar

```bash
# 1. Abre index.html en el navegador y edita lo que quieras.
# 2. Sube los cambios (GitHub Actions despliega solo):
git add .
git commit -m "descripción del cambio"
git push
```

> Nota: el asistente de IA necesita la variable `GEMINI_API_KEY` configurada como secreto
> en el repositorio (Settings → Secrets and variables → Actions). Sin ella, la web funciona
> igual, pero el asistente no responde. La gráfica de mercados no necesita ninguna clave:
> un workflow programado descarga los datos con yfinance cada 2 horas y los guarda en
> `datos/mercados.json` (se conserva el dato anterior si una descarga falla).

## ⚠️ Aviso

La web tiene un propósito **educativo**. Nada de lo que contiene es asesoramiento
financiero: cada uno es responsable de sus decisiones con su dinero.
