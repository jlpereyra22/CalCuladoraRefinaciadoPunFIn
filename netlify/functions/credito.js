// GET /api/credito?id=<creditoId>
// Devuelve el crédito + sus cuotas YA clasificadas (pagada/mora/pendiente) + resumen.
// Autocompleta los bloques 1 y 2 de la calculadora. SOLO LECTURA.
// En modo mock (sin service account) devuelve un crédito de ejemplo.
const { isMock, getDb, corsHeaders, requireAuth, tsToIso, clasificarCuota, json } = require("./_lib");
const mock = require("./_mock");

// Clasifica + resume una lista de cuotas (objetos planos con vencimiento en ISO).
function armarRespuesta(credito, cuotasPlain) {
  const nowMs = Date.now();
  let cuotasPagadas = 0, cuotasEnMora = 0, cuotasPendientes = 0, saldoTotal = 0;
  let inicioMora = null;

  const cuotas = cuotasPlain.map((x) => {
    const clasificacion = clasificarCuota(x, nowMs);
    const venc = x.vencimiento || null;
    if (clasificacion === "pagada") cuotasPagadas += 1;
    else if (clasificacion === "mora") {
      cuotasEnMora += 1;
      if (venc && (!inicioMora || venc < inicioMora)) inicioMora = venc;
    } else cuotasPendientes += 1;
    saldoTotal += Number(x.saldoPendiente ?? 0);
    return {
      nroCuota: Number(x.nroCuota ?? 0),
      montoCuota: Number(x.montoCuota ?? 0),
      saldoPendiente: Number(x.saldoPendiente ?? 0),
      vencimiento: venc,
      estado: String(x.estado || ""),
      clasificacion,
    };
  });

  return {
    credito,
    resumen: { cuotasPagadas, cuotasEnMora, cuotasPendientes, inicioMora, saldoTotal: Math.round(saldoTotal * 100) / 100 },
    cuotas,
  };
}

exports.handler = async (event) => {
  const headers = corsHeaders();
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") return json(405, headers, { error: "Solo GET" });

  const auth = requireAuth(event);
  if (auth) return json(auth.status, headers, { error: auth.msg });

  try {
    // --- Modo mock (local sin credenciales) ---
    if (isMock()) {
      return json(200, headers, { mock: true, ...armarRespuesta(mock.mockCredito(), mock.mockCuotas()) });
    }

    // --- Modo real (Firestore) ---
    const id = (event.queryStringParameters?.id || "").trim();
    if (!id) return json(400, headers, { error: "Falta ?id=<creditoId>" });

    const db = getDb();
    const credSnap = await db.collection("creditos").doc(id).get();
    if (!credSnap.exists) return json(404, headers, { error: "Crédito no encontrado" });
    const c = credSnap.data() || {};

    const cuotasSnap = await db.collection("creditos").doc(id)
      .collection("cuotas").orderBy("nroCuota", "asc").get();

    const cuotasPlain = cuotasSnap.docs.map((d) => {
      const x = d.data() || {};
      return {
        nroCuota: Number(x.nroCuota ?? 0),
        montoCuota: Number(x.montoCuota ?? 0),
        saldoPendiente: Number(x.saldoPendiente ?? 0),
        vencimiento: tsToIso(x.vencimiento),
        estado: String(x.estado || ""),
      };
    });

    const credito = {
      id,
      clienteNombre: String(c.snapshot?.clienteNombre || ""),
      clienteDni: String(c.snapshot?.clienteDni || ""),
      comercioNombre: String(c.snapshot?.comercioNombre || ""),
      estado: String(c.estado || ""),
      montoCredito: Number(c.montoCredito ?? 0),
      montoPorCuota: Number(c.montoPorCuota ?? 0),
      cantCuotas: Number(c.cantCuotas ?? 0),
      interesPct: Number(c.interesPct ?? 0),
      montoFinanciado: Number(c.montoFinanciado ?? 0),
      fechaEntrega: tsToIso(c.fechaEntrega),
    };

    return json(200, headers, armarRespuesta(credito, cuotasPlain));
  } catch (err) {
    return json(500, headers, { error: err.message });
  }
};
