#!/usr/bin/env python3
"""Descarga datos de mercado (yfinance) y genera datos/mercados.json.

Se ejecuta cada 2 horas en GitHub Actions (workflow datos.yml). Si un activo
falla, se conserva el dato anterior para que la web nunca se quede vacía.
"""

import datetime
import json
import os
import sys

import yfinance as yf

ACTIVOS = [
    {"clave": "SPX",  "nombre": "S&P 500",      "simbolo": "^GSPC"},
    {"clave": "IBEX", "nombre": "IBEX 35",      "simbolo": "^IBEX"},
    {"clave": "NDX",  "nombre": "Nasdaq 100",   "simbolo": "^NDX"},
    {"clave": "DAX",  "nombre": "DAX",          "simbolo": "^GDAXI"},
    {"clave": "SX5E", "nombre": "Euro Stoxx 50", "simbolo": "^STOXX50E"},
    {"clave": "BTC",  "nombre": "Bitcoin",      "simbolo": "BTC-USD"},
    {"clave": "XAU",  "nombre": "Oro",          "simbolo": "GC=F"},
]

RUTA = "datos/mercados.json"
SESIONES_MAX = 60


def leer_anterior():
    """Devuelve los activos del JSON anterior, para conservar lo que falle."""
    if not os.path.exists(RUTA):
        return {}
    try:
        with open(RUTA, encoding="utf-8") as f:
            return json.load(f).get("activos", {})
    except Exception:
        return {}


def principal():
    anterior = leer_anterior()
    activos = {}

    for a in ACTIVOS:
        try:
            d = yf.download(a["simbolo"], period="2mo", interval="1d",
                            progress=False, auto_adjust=False)
            if len(d) == 0:
                print(f"- {a['clave']}: sin datos, se mantiene el anterior")
                if a["clave"] in anterior:
                    activos[a["clave"]] = anterior[a["clave"]]
                continue
            cierre = d["Close"] if not hasattr(d["Close"], "columns") else d["Close"][a["simbolo"]]
            serie = [[str(fecha.date()), round(float(valor), 4)] for fecha, valor in cierre.items()]
            activos[a["clave"]] = {
                "nombre": a["nombre"],
                "simbolo": a["simbolo"],
                "serie": serie[-SESIONES_MAX:],
            }
            print(f"+ {a['clave']}: {len(serie)} sesiones")
        except Exception as e:
            print(f"x {a['clave']}: {e} (se mantiene el anterior)")
            if a["clave"] in anterior:
                activos[a["clave"]] = anterior[a["clave"]]

    if not activos:
        print("ERROR: no se ha obtenido ningún dato")
        sys.exit(1)

    datos = {
        "actualizado": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "activos": activos,
    }
    os.makedirs("datos", exist_ok=True)
    with open(RUTA, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, separators=(",", ":"))
    print(f"OK: {RUTA} con {len(activos)} activos")


if __name__ == "__main__":
    principal()
