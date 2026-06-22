# CLAUDE.md — Generador de Refinanciación

> Identidad, reglas y arquitectura del proyecto. Documento vivo: si cambia la lógica, se actualiza acá primero.
>
> **Proyecto:** Generador de Refinanciación (calculadora) · parte del ecosistema **Punto Financiamiento** (`sysadminpf`)
> **Tipo:** Herramienta standalone (Etapa 1) + integración Firebase (Etapa 2)
> **Estado:** Etapa 1 — deployada en GitHub Pages (`main`). Etapa 2 — **deployada en Netlify** (`integracion-firebase`).
> **Repo:** https://github.com/jlpereyra22/CalCuladoraRefinaciadoPunFIn
> **URL pública (Etapa 1):** https://jlpereyra22.github.io/CalCuladoraRefinaciadoPunFIn/
> **URL pública (Etapa 2):** https://refi-punfin.netlify.app — cuenta personal de ChuecoTriquis (`pereyrajose848@gmail.com`), NO la de sysadminpf.
> Última actualización: 2026-06-22

---

## 1. Qué es

Calculadora rápida para **reestructurar (refinanciar) créditos en mora** de Punto Financiamiento. Un cliente que cayó en mora (pagó algunas cuotas y dejó de pagar) puede renegociar la deuda.

**Etapa 1 (standalone):** no se conecta a ningún backend. Todo el cálculo es local en el navegador con carga manual de datos.

**Etapa 2 (integración, rama `integracion-firebase`):** se conecta a Firestore de `sysadminpf` a través de **Netlify Functions** de solo lectura (Firebase Admin SDK con `Cloud Datastore Viewer`). El front busca cliente/crédito por DNI o nombre, autocarga los datos, y el operador solo completa el plan.

---

## 2. Roles de trabajo (las dos Claudias)

- **ChuecoTriquis**: asigna tareas, decide, **commitea y pushea**. Es el único que sube al repo.
- **Claudia Creativa** (claude.ai): propone, diseña, da visión. No ejecuta sin aprobación.
- **Claudia Seria** (Claude Code): implementa, audita, entiende el código. Ejecuta lo aprobado. **No commitea ni pushea sin "ok" explícito.** Reporta `/cost` al cerrar tareas.

---

## 3. Reglas críticas (NO NEGOCIABLES)

1. **Solo ChuecoTriquis commitea y pushea.** Claudia Seria prepara archivos; no sube nada sin aprobación.
2. **Cero deploy sin intención explícita.** El ecosistema PF está en producción con datos reales.
3. **Archivos sensibles = solo lectura para contexto** (`.env*`, `service-account.json`, tokens, API keys). Nunca escribirlos, copiarlos ni loguearlos.
4. **Aprobación explícita antes de operaciones destructivas** (`rm -rf`, `git push --force`, `git reset --hard`, deploys).
5. **No se toca `repartoService` ni la lógica de `sysadminpf`.** Este proyecto es independiente y de solo lectura respecto del sistema grande.

---

## 4. Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla, en un único `index.html` (sin build, sin dependencias, sin CDN) |
| Backend | Netlify Functions (Node.js) — solo lectura de Firestore |
| Auth Firebase | Service account `refi-readonly@sysadminpf.iam.gserviceaccount.com` (rol `Cloud Datastore Viewer`) |
| Login app | Usuario/contraseña via `APP_USER`/`APP_PASS` env vars, validados server-side |
| Server local | `netlify dev` (levanta front + functions con bypass de login) |
| Deploy Etapa 1 | **GitHub Pages** rama `main` → https://jlpereyra22.github.io/CalCuladoraRefinaciadoPunFIn/ |
| Deploy Etapa 2 | **Netlify** rama `integracion-firebase` → https://refi-punfin.netlify.app (cuenta personal `pereyrajose848@gmail.com`) |

---

## 5. Modelo financiero (el corazón del proyecto)

### 5.1 Composición del monto a refinanciar

| Parte | Cómo entra | Por qué |
|---|---|---|
| **Cuotas en mora** (vencidas) | **Valor pleno** (capital + interés, 100% devengado) **+ punitorio** | Ya vencieron: el interés se ganó y encima hay atraso |
| **Cuotas pendientes** (por vencer) | **Capital + interés devengado a la fecha** | El interés se devenga en el tiempo; lo ya devengado se cobra |
| **Interés futuro no devengado** | **Se descarta** | Lo vuelve a cobrar el plan nuevo → evita doble cobro (anatocismo) |

```
MONTO A REFINANCIAR = mora(valor pleno) + punitorio + pendientes(capital + devengado)
```

### 5.2 Devengamiento del interés (decisión clave)

El interés se concibe como **costo del dinero en el tiempo**: **se devenga linealmente** desde el origen del crédito hasta el vencimiento de cada cuota.

- Para cada cuota pendiente `k`: `devengado_k = interesCuota × min(1, díasTranscurridos / díasHastaVencimiento_k)`.
- Cuotas en mora → fracción = 1 (interés totalmente devengado).
- **Supuesto:** cuotas **mensuales**. El origen se deduce: `origen = inicioMora − (cuotasPagadas + 1) meses`.

### 5.3 Punitorio (mora)

`punitorio = valorPlenoMora × (tasaDiariaMora% / 100) × díasDeMora`

- Tasa diaria de mora: **0.4% fija** (campo bloqueado, no editable por el operador).
- Se aplica **solo** sobre las cuotas en mora, nunca sobre las pendientes.

### 5.4 Plan nuevo: interés directo (no francés)

Tres modos de armar el plan:

1. **Por cantidad de cuotas** → interés % total (se aplica una vez). `total = base × (1 + tasa)`.
2. **Por monto mensual** → interés % por cuota. Tabla de simulación 1..máx cuotas. El operador hace clic en la fila que quiere usar.
3. **Cuota fija** → interés % por cuota. El cliente dice cuánto puede pagar por mes: el sistema calcula `N = ceil(base / (cuota - base × tasa))`, genera N−1 cuotas iguales + última cuota = el resto.

Interés del plan: **7% editable por el operador**.

---

## 6. Reglas inviolables del cálculo

1. **No se cobra interés sobre interés** (anatocismo). El interés futuro no devengado se descarta antes de aplicar el plan nuevo.
2. **El punitorio solo aplica a cuotas en mora.**
3. **El interés ya devengado no se regala** (se cobra el del tiempo transcurrido).
4. **Todo cálculo es local.** No se persiste ni se envía nada a terceros.

---

## 6b. Etapas del proyecto

| Etapa | Alcance | Estado |
|---|---|---|
| **Etapa 1** | Standalone, carga manual de todos los datos. | **Deployada — GitHub Pages** |
| **Etapa 2** | Integración Firebase: busca cliente/crédito y autocarga datos. Login de acceso. Botones de copia para auditor y cliente. | **Deployada — Netlify** |

---

## 7. Limitaciones conocidas

- **Cuotas mensuales** asumidas. Quincenal/semanal requeriría parametrizar el período.
- **Secuencialidad** asumida: las pagadas son las primeras, luego las en mora, luego las pendientes.
- **Punitorio con una sola fecha** (la cuota más vieja en mora) sobre todo el bloque de mora.
- El origen del crédito se **deduce**; no se carga la fecha real de originación.
- Búsqueda por nombre: case-sensitive, por apellido (cómo está en Firestore). Usar DNI para resultados confiables.

---

## 8. Archivos del proyecto

| Archivo | Rol |
|---|---|
| `index.html` | La calculadora completa (HTML + CSS + JS inline) |
| `netlify/functions/_lib.js` | Utilidades compartidas: auth, Firestore, mock, CORS |
| `netlify/functions/_mock.js` | Datos demo (crédito de 12 cuotas) |
| `netlify/functions/buscar.js` | GET /api/buscar?q= (por DNI o nombre) |
| `netlify/functions/credito.js` | GET /api/credito?id= (detalle + cuotas clasificadas) |
| `netlify.toml` | Config Netlify: publish=`.`, functions, redirects /api/* |
| `package.json` | Dependencia: firebase-admin |
| `.env` | Variables locales (gitignored) |
| `.env.example` | Plantilla de variables (committed) |
| `service-account.json` | Key GCP read-only (gitignored, NUNCA al repo) |
| `CLAUDE.md` | Este documento |
| `NEKO_LOG.md` | Bitácora de decisiones |
| `.gitignore` | Archivos ignorados |

---

## 9. Variables de entorno (Netlify)

| Variable | Valor | Dónde |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo de service-account.json (una línea) | Netlify dashboard |
| `FIREBASE_PROJECT_ID` | `sysadminpf` | Netlify dashboard |
| `APP_USER` | usuario del login | Netlify dashboard |
| `APP_PASS` | contraseña del login | Netlify dashboard |
| `ALLOWED_ORIGIN` | `https://refi-punfin.netlify.app` | Netlify dashboard |

En local (`.env`): usar `FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json`. El login se bypasea automáticamente en `netlify dev`.
