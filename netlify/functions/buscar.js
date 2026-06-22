// GET /api/buscar?q=<DNI o nombre>
// Busca clientes por DNI (exacto) o por nombre (prefijo) y devuelve sus créditos.
// El front muestra la lista y, al elegir un crédito, llama a /api/credito?id=. SOLO LECTURA.
const { isMock, getDb, corsHeaders, requireAuth, json } = require("./_lib");
const mock = require("./_mock");

// Carácter alto de Unicode para acotar el rango del prefijo en Firestore.
const HIGH = String.fromCharCode(0xf8ff);

exports.handler = async (event) => {
  const headers = corsHeaders();
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") return json(405, headers, { error: "Solo GET" });

  const auth = requireAuth(event);
  if (auth) return json(auth.status, headers, { error: auth.msg });

  try {
    const q = (event.queryStringParameters?.q || "").trim();
    if (q.length < 3) {
      return json(400, headers, { error: "Ingresá al menos 3 caracteres (DNI o nombre)" });
    }

    // --- Modo mock (local sin credenciales) ---
    if (isMock()) return json(200, headers, mock.mockBuscar(q));

    const db = getDb();
    const clientesRef = db.collection("clientes");

    // DNI numérico (limpiando puntos/espacios) → match exacto. Texto → prefijo por nombre.
    const qDni = q.replace(/[.\s]/g, "");
    let clienteDocs;
    if (/^\d+$/.test(qDni)) {
      // DNI puede estar guardado como string o como number → probamos ambos.
      clienteDocs = (await clientesRef.where("dni", "==", qDni).limit(10).get()).docs;
      if (!clienteDocs.length) {
        clienteDocs = (await clientesRef.where("dni", "==", Number(qDni)).limit(10).get()).docs;
      }
    } else {
      clienteDocs = (await clientesRef.orderBy("nombre").startAt(q).endAt(q + HIGH).limit(10).get()).docs;
    }

    const resultados = [];
    for (const cd of clienteDocs) {
      const cli = cd.data() || {};
      const credSnap = await db.collection("creditos").where("clienteId", "==", cd.id).limit(20).get();
      const creditos = credSnap.docs.map((d) => {
        const x = d.data() || {};
        return {
          id: d.id,
          comercioNombre: String(x.snapshot?.comercioNombre || ""),
          estado: String(x.estado || ""),
          montoCredito: Number(x.montoCredito ?? 0),
          cantCuotas: Number(x.cantCuotas ?? 0),
        };
      });
      resultados.push({
        clienteId: cd.id,
        nombre: String(cli.nombre || ""),
        dni: String(cli.dni || ""),
        creditos,
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ resultados }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
