// _mock.js — datos de ejemplo para correr en LOCAL sin service account.
// Reproduce un crédito realista: 12 cuotas, 2 pagadas, 2 en mora, 8 pendientes.

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

const CAP = 1000000;          // capital
const N = 12;                 // cuotas totales
const INT = 84;               // interés directo total (7% x 12)
const FIN = Math.round(CAP * (1 + INT / 100));   // financiado = 1.840.000
const CUOTA = Math.round(FIN / N);               // valor de cuota ≈ 153.333
const ENTREGA = daysFromNow(-135);               // originación ~ hace 4,5 meses

function mockCredito() {
  return {
    id: "MOCK-CRED-001",
    clienteNombre: "Juan Pérez (DEMO)",
    clienteDni: "30123456",
    comercioNombre: "Comercio Demo",
    estado: "activo",
    montoCredito: CAP,
    montoPorCuota: CUOTA,
    cantCuotas: N,
    interesPct: INT,
    montoFinanciado: FIN,
    fechaEntrega: ENTREGA,
  };
}

// Cuota i vence en (-135 + i*30) días: 1-2 pagadas, 3-4 vencidas (mora), 5-12 futuras.
function mockCuotas() {
  const out = [];
  for (let i = 1; i <= N; i++) {
    const pagada = i <= 2;
    out.push({
      nroCuota: i,
      montoCuota: CUOTA,
      saldoPendiente: pagada ? 0 : CUOTA,
      vencimiento: daysFromNow(-135 + i * 30),
      estado: pagada ? "pagada" : "pendiente",
    });
  }
  return out;
}

function mockBuscar() {
  return {
    mock: true,
    resultados: [
      {
        clienteId: "MOCK-CLI-001",
        nombre: "Juan Pérez (DEMO)",
        dni: "30123456",
        creditos: [
          { id: "MOCK-CRED-001", comercioNombre: "Comercio Demo", estado: "activo", montoCredito: CAP, cantCuotas: N },
        ],
      },
    ],
  };
}

module.exports = { mockCredito, mockCuotas, mockBuscar };
