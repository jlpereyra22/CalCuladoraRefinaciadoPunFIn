# CLAUDE.md — Generador de Refinanciación

> Identidad, reglas y arquitectura del proyecto. Documento vivo: si cambia la lógica, se actualiza acá primero.
>
> **Proyecto:** Generador de Refinanciación (calculadora) · parte del ecosistema **Punto Financiamiento** (`sysadminpf`)
> **Tipo:** Herramienta **standalone** · sitio estático (un solo `index.html`)
> **Estado:** Etapa 1 — standalone con carga manual, lista para deploy
> Última actualización: 2026-06-18

---

## 1. Qué es

Calculadora rápida para **reestructurar (refinanciar) créditos en mora** de Punto Financiamiento. Un cliente que cayó en mora (pagó algunas cuotas y dejó de pagar) puede renegociar la deuda. Esta herramienta calcula, con carga manual de datos, **cuánto se refinancia y en qué plan**.

No se conecta a ningún backend ni base de datos. No lee ni escribe en `sysadminpf`. **No maneja credenciales.** Todo el cálculo es local en el navegador.

---

## 2. Roles de trabajo (las dos Claudias)

- **ChuecoTriquis**: asigna tareas, decide, **commitea y pushea**. Es el único que sube al repo.
- **Claudia Creativa** (claude.ai): propone, diseña, da visión. No ejecuta sin aprobación.
- **Claudia Seria** (Claude Code): implementa, audita, entiende el código. Ejecuta lo aprobado. **No commitea ni pushea sin "ok" explícito.** Reporta `/cost` al cerrar tareas.

---

## 3. Reglas críticas (NO NEGOCIABLES)

1. **Solo ChuecoTriquis commitea y pushea.** Claudia Seria prepara archivos; no sube nada sin aprobación.
2. **Cero deploy sin intención explícita.** El ecosistema PF está en producción con datos reales; esta herramienta es local hasta decisión.
3. **Archivos sensibles = solo lectura para contexto** (`.env*`, `*-adminsdk-*.json`, `serviceAccountKey.json`, tokens, API keys). Nunca escribirlos, copiarlos ni loguearlos. *(Hoy este proyecto no tiene ninguno — sigue valiendo la regla.)*
4. **Aprobación explícita antes de operaciones destructivas** (`rm -rf`, `git push --force`, `git reset --hard`, deploys).
5. **No se toca `repartoService` ni la lógica de `sysadminpf`.** Este proyecto es independiente y de lectura respecto del sistema grande.

---

## 4. Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla, en un único `index.html` (sin build, sin dependencias, sin CDN) |
| Server local | `python -m http.server 8080 --bind 127.0.0.1` (solo para ver en local) |
| Deploy (a definir) | Sitio estático → candidatos: Netlify (como `sysadminpf`) o GitHub Pages |

Decisión de diseño: **un solo archivo, cero dependencias.** Se abre con doble click o se sirve estático. Prioridad: velocidad y que cualquiera lo pueda auditar.

---

## 5. Modelo financiero (el corazón del proyecto)

### 5.1 Composición del monto a refinanciar

La deuda se descompone en partes con tratamiento distinto:

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
- **Supuesto:** cuotas **mensuales**. El origen del crédito se deduce de la fecha de inicio de mora: `origen = inicioMora − (cuotasPagadas + 1) meses` (el inicio de mora es el vencimiento de la primera cuota impaga).

### 5.3 Punitorio (mora)

`punitorio = valorPlenoMora × (tasaDiariaMora% / 100) × díasDeMora`

Días de mora = fecha de cálculo − fecha de inicio de mora. Se aplica **solo** sobre las cuotas en mora, nunca sobre las pendientes.

### 5.4 Plan nuevo: interés directo (no francés)

- **Interés directo por cuota**, default **7%**. Ej: 3 cuotas = 21%, 12 cuotas = 84%.
- `interés = base × (tasa% / 100) × cantidadCuotas` (modo "% por cuota") o `× 1` (modo "% total").
- `totalRefinanciado = base + interés` · `valorCuota = total / cantidadCuotas`.

### 5.5 Dos modos de armar el plan

1. **Por cantidad de cuotas**: se fija N → devuelve valor de cada cuota.
2. **Por monto mensual**: se fija lo que el cliente puede pagar + máximo de cuotas (default 12) → tabla de simulación 1..máx, marca cuáles "entran" (cuota ≤ monto) y recomienda la **primera que entra** (menos cuotas posibles dentro del presupuesto).

---

## 6. Reglas inviolables del cálculo

1. **No se cobra interés sobre interés** (anatocismo). El interés futuro no devengado se descarta antes de aplicar el plan nuevo.
2. **El punitorio solo aplica a cuotas en mora.**
3. **El interés ya devengado no se regala** (se cobra el del tiempo transcurrido).
4. **Todo cálculo es local.** No se persiste ni se envía nada.

---

## 6b. Etapas del proyecto

| Etapa | Alcance | Estado |
|---|---|---|
| **Etapa 1** | Standalone, **carga manual** de todos los datos. Se deploya solo y trabaja por sí mismo. Sale vacío (sin datos precargados). | **Actual — lista para deploy** |
| **Etapa 2** | Integración con `sysadminpf`: buscar el cliente/crédito directamente y **autocargar** capital, cuotas, pagos, mora. Elimina la carga manual. | Futuro |

> Etapa 1 entrega valor sin tocar producción. Etapa 2 recién conecta con el sistema (decisión y diseño aparte).

---

## 7. Limitaciones conocidas

- **Cuotas mensuales** asumidas. Quincenal/semanal requeriría parametrizar el período.
- **Secuencialidad** asumida: las pagadas son las primeras, luego las en mora, luego las pendientes.
- **Punitorio con una sola fecha** (la cuota más vieja en mora) sobre todo el bloque de mora. Si cada cuota vencida arrastra sus propios días, hay que afinarlo.
- El origen del crédito se **deduce**; no se carga la fecha real de originación.

---

## 8. Archivos del proyecto

| Archivo | Rol |
|---|---|
| `index.html` | La calculadora completa (HTML + CSS + JS inline) |
| `CLAUDE.md` | Este documento |
| `README.md` | Cómo correr y deployar |
| `NEKO_LOG.md` | Bitácora de decisiones |
| `.gitignore` | Archivos ignorados |

> **Nota sobre `.env.config.json`:** no aplica por ahora. Este proyecto no tiene backend, endpoints ni credenciales. Si en el futuro se conecta a `sysadminpf`, se crea acá (solo URLs públicas, sin secretos).
