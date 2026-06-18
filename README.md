# Generador de Refinanciación

Calculadora para **reestructurar créditos en mora** de Punto Financiamiento. Carga manual, cálculo 100% local, sin dependencias.

## Qué hace

A partir de los datos de un crédito en mora calcula el **monto a refinanciar** y arma el **plan nuevo**:

1. **Crédito original** → capital, valor de cuota, cuotas totales (deriva interés, capital/cuota e interés/cuota).
2. **Estado** → cuotas pagadas, en mora, fecha de inicio de mora y tasa diaria de mora.
3. **Composición del monto a refinanciar**:
   - Cuotas en mora → valor pleno + punitorio
   - Cuotas pendientes → capital + interés ya devengado (descarta el interés futuro)
4. **Plan de refinanciación** con interés directo (default 7% por cuota), en dos modos:
   - Por cantidad de cuotas
   - Por monto mensual (tabla de simulación que recomienda el mejor plan)

> El detalle del modelo financiero está en [CLAUDE.md](CLAUDE.md).

## Cómo correr en local

No requiere instalación. Dos opciones:

**A) Doble click** sobre `index.html`.

**B) Servidor local** (recomendado para que se comporte igual que en deploy):

```bash
python -m http.server 8080 --bind 127.0.0.1
```

Abrir http://localhost:8080

## Deploy

Es un sitio estático (un solo archivo). Candidatos:

- **GitHub Pages**: activar Pages sobre la rama principal; sirve `index.html` directo.
- **Netlify**: arrastrar la carpeta o conectar el repo (sin build command; publish directory = raíz).

> ⚠️ **Cero deploy sin intención explícita de ChuecoTriquis.**

## Estructura

```
.
├── index.html      # la calculadora (HTML + CSS + JS inline)
├── CLAUDE.md       # identidad, reglas, modelo financiero
├── README.md       # este archivo
├── NEKO_LOG.md     # bitácora de decisiones
└── .gitignore
```

## Stack

HTML + CSS + JavaScript vanilla. Sin build, sin npm, sin CDN.
