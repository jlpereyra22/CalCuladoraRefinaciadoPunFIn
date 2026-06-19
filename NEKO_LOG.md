# NEKO_LOG.md — Bitácora de decisiones

> Trazabilidad de decisiones de producto y técnicas. Lo más nuevo arriba.

---

## 2026-06-18 — Repo + deploy Etapa 1

- **Repo creado y pusheado** (commit inicial autorizado explícitamente por ChuecoTriquis; init + push los hizo Claudia Seria por única vez). Identidad git **local** al repo (`jlpereyra22` / pereyrajose@nexotuc.com). Chequeo de secretos en staged: OK.
  - Remoto: https://github.com/jlpereyra22/CalCuladoraRefinaciadoPunFIn
- **Deploy: GitHub Pages** (rama `main`, `/root`). Elegido sobre Netlify para **aislamiento total de `sysadminpf`**: la cuenta Netlify logueada en el CLI es la de producción de PF; GitHub Pages corre en la cuenta personal de GitHub de ChuecoTriquis, sin ninguna relación con el sistema en producción.
  - URL pública: https://jlpereyra22.github.io/CalCuladoraRefinaciadoPunFIn/
- **Incidencia menor:** se cargó por error `calculadorapunfin` como *custom domain* (inválido) → se removió. GitHub pudo haber agregado un archivo `CNAME` en el remoto al setearlo; **pendiente verificar con `git pull`** para sincronizar el local.

---

## 2026-06-18 — Plan de dos etapas

- **Etapa 1 (ahora):** deploy standalone, sale **vacío** tal cual está, con **carga manual** de todos los datos. Objetivo: salir jugando ya, que el sistema trabaje solo. Sin tocar producción.
- **Etapa 2 (después):** integrar a `sysadminpf` para **buscar el cliente directamente** y autocargar todos los datos (capital, cuotas, pagos, mora). Elimina la carga manual.

Razonamiento: Etapa 1 entrega valor inmediato y de bajo riesgo (no toca el sistema en producción). La integración es un proyecto aparte con su propio diseño.

---

## 2026-06-18 — Arranque del proyecto y modelo financiero

### Contexto
ChuecoTriquis necesita una calculadora rápida (urgencia) para reestructurar créditos de Punto Financiamiento que cayeron en mora. Standalone, carga manual.

### Decisiones tomadas

1. **Arquitectura: standalone, un solo `index.html`.** Sin build ni dependencias, para máxima velocidad y auditabilidad. Server local con `python -m http.server` solo para previsualizar.

2. **Interés del plan nuevo: directo (no francés), 7% por cuota.** 3 cuotas = 21%, 12 cuotas = 84%. Transparente y alineado a lo que ya usan. Modelo: `base × tasa × cuotas`.

3. **Separación mora vs pendientes.** No es lo mismo refinanciar todo junto que tratar lo vencido y lo por vencer distinto:
   - **Mora** → valor pleno + punitorio (solo sobre la mora).
   - **Pendientes** → no se les aplica punitorio.

4. **Tratamiento de las cuotas pendientes: capital + interés devengado a la fecha.**
   - Primer enfoque considerado: *capital puro* (descartar todo el interés de las pendientes). Se descartó porque **regala el interés ya ganado**.
   - Enfoque considerado: *valor pleno* (cobrar todo). Se descartó porque genera **doble interés** al sumarle el plan nuevo (anatocismo, caro/discutible).
   - **Decisión final:** el interés se concibe como **costo del dinero en el tiempo** → **se devenga**. Se cobra el interés devengado hasta hoy y se descarta solo el futuro (que lo reemplaza el plan nuevo). Ni se regala lo ganado, ni se duplica el futuro.

5. **Devengamiento lineal**, desde el origen del crédito hasta el vencimiento de cada cuota. Supuesto: **cuotas mensuales**; el origen se deduce del inicio de mora (`origen = inicioMora − (pagadas + 1) meses`).

6. **Dos modos de plan:** por cantidad de cuotas, y por monto mensual (tabla de simulación 1..máx que marca qué planes entran en el presupuesto y recomienda la primera opción que entra).

### Pendiente / a confirmar
- ¿Cuotas siempre mensuales? (si hay quincenal/semanal → parametrizar período)
- Punitorio: ¿una fecha para todo el bloque de mora, o días propios por cuota vencida?
- Definir target de deploy (Netlify vs GitHub Pages).
- Posibles próximos: botón imprimir/PDF, detalle de cuotas con vencimientos.

### Estado
Calculadora funcionando end-to-end en local. Documentación (CLAUDE.md, README.md, este log, .gitignore) creada. Repo y deploy a cargo de ChuecoTriquis.
