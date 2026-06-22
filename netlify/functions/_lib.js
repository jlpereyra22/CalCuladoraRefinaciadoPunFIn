// _lib.js — utilidades compartidas de las funciones de SOLO LECTURA.
//
// MODO MOCK (local-first): si NO está seteada FIREBASE_SERVICE_ACCOUNT, las funciones
// devuelven datos de ejemplo y no tocan Firestore ni piden token. Sirve para validar
// todo el flujo en local sin credenciales. Cuando se setea la service account read-only,
// pasa a leer Firestore de verdad y exige el token.

// firebase-admin se carga lazy (solo en modo real) para que el mock corra sin instalar nada.
let _admin = null;
function getAdmin() {
  if (!_admin) _admin = require("firebase-admin");
  return _admin;
}

// La service account puede venir como JSON en una variable (deploy en Netlify)
// o como ruta a un archivo (cómodo en local). Si no hay ninguna → modo mock.
function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim()) return JSON.parse(raw);
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (p && p.trim()) {
    const fs = require("fs");
    const path = require("path");
    const full = path.resolve(process.cwd(), p.trim());
    return JSON.parse(fs.readFileSync(full, "utf8"));
  }
  return null;
}

function isMock() {
  return !(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
}

function getDb() {
  const admin = getAdmin();
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    if (!serviceAccount) throw new Error("Falta la service account (FIREBASE_SERVICE_ACCOUNT o FIREBASE_SERVICE_ACCOUNT_PATH)");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || "sysadminpf",
    });
  }
  return admin.firestore();
}

// CORS: por defecto restringido al dominio del front (ALLOWED_ORIGIN).
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, x-app-user, x-app-pass",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  };
}

// Login con usuario + contraseña (validado en el servidor contra APP_USER/APP_PASS).
// En modo mock no se exige; en local (netlify dev) tampoco, para probar sin fricción.
// Devuelve null si OK, o {status, msg} si hay que rechazar.
function requireAuth(event) {
  if (isMock()) return null;
  if (process.env.NETLIFY_DEV === "true") return null; // local: sin login
  const U = process.env.APP_USER, P = process.env.APP_PASS;
  if (!U || !P) return { status: 500, msg: "Login no configurado (faltan APP_USER/APP_PASS)" };
  const u = event.headers["x-app-user"] || "";
  const p = event.headers["x-app-pass"] || "";
  if (u !== U || p !== P) return { status: 401, msg: "Usuario o contraseña inválidos" };
  return null;
}

function tsToIso(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (typeof ts._seconds === "number") return new Date(ts._seconds * 1000).toISOString();
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
  if (typeof ts === "string") return ts;
  return null;
}

// Clasifica una cuota igual que el sistema grande:
//  - pagada:    estado "pagada" o saldoPendiente <= 0
//  - mora:      saldoPendiente > 0 y vencimiento < ahora
//  - pendiente: saldoPendiente > 0 y vencimiento >= ahora
function clasificarCuota(cuota, nowMs) {
  const saldo = Number(cuota.saldoPendiente ?? 0);
  const estado = String(cuota.estado || "").toLowerCase();
  if (estado === "pagada" || (Number.isFinite(saldo) && saldo <= 0)) return "pagada";
  const venc = tsToIso(cuota.vencimiento);
  const vMs = venc ? new Date(venc).getTime() : null;
  if (vMs != null && vMs < nowMs) return "mora";
  return "pendiente";
}

function json(statusCode, headers, obj) {
  return { statusCode, headers, body: JSON.stringify(obj) };
}

module.exports = { isMock, getDb, corsHeaders, requireAuth, tsToIso, clasificarCuota, json };
