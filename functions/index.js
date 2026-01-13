/**
 * functions/index.js (GEN1)
 * Importante: usamos firebase-functions/v1 para que exista functions.region()
 * y evitar Cloud Run (Gen2) que te está bloqueando el preflight CORS.
 */

const admin = require("firebase-admin");
admin.initializeApp();

const functions = require("firebase-functions/v1");

function toInternalEmail(username) {
  const base = String(username || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 30);

  if (!base) return null;
  return `${base}@ingenieria-sas.local`;
}

const ALLOWED_ORIGINS = new Set([
  "https://ingenieria-sas.web.app",
  "https://ingenieria-sas.firebaseapp.com",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
]);

function applyCors(req, res) {
  const origin = req.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendError(res, status, message) {
  return res.status(status).json({ error: { message } });
}

exports.createUserAccount = functions
  .region("us-central1")
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB"
  })
  .https.onRequest(async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    if (req.method !== "POST") {
      return sendError(res, 405, "Método no permitido.");
    }

    const authHeader = req.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return sendError(res, 401, "Debes iniciar sesión.");
    }

    let callerUid;
    try {
      const token = authHeader.replace("Bearer ", "");
      const decoded = await admin.auth().verifyIdToken(token);
      callerUid = decoded.uid;
    } catch (error) {
      return sendError(res, 401, "Token inválido o expirado.");
    }

    const payload = req.body?.data ?? req.body ?? {};
    const name = String(payload.name || "").trim();
    const usernameRaw = String(payload.username || "").trim();
    const password = String(payload.password || "");
    const role = String(payload.role || "").trim(); // "empleado" o "lider"

    if (!usernameRaw || !password || !role) {
      return sendError(res, 400, "Faltan campos obligatorios.");
    }
    if (password.length < 6) {
      return sendError(res, 400, "La contraseña debe tener mínimo 6 caracteres.");
    }

    const usernameKey = usernameRaw.toLowerCase();

    const email = payload.email
      ? String(payload.email).trim().toLowerCase()
      : toInternalEmail(usernameKey);

    if (!email) {
      return sendError(res, 400, "Username inválido para generar email interno.");
    }

    const callerSnap = await admin.firestore().doc(`users/${callerUid}`).get();

    if (!callerSnap.exists) {
      return sendError(res, 403, "Tu perfil no existe en /users.");
    }

    const callerRole = callerSnap.data().role;

    if (callerRole === "lider" && role !== "empleado") {
      return sendError(res, 403, "Un líder solo puede crear empleados.");
    }
    if (callerRole !== "admin" && callerRole !== "lider") {
      return sendError(res, 403, "Sin permisos para crear usuarios.");
    }

    const usernameRef = admin.firestore().doc(`usernames/${usernameKey}`);
    const usernameDoc = await usernameRef.get();
    if (usernameDoc.exists) {
      return sendError(res, 409, "Username ya está en uso.");
    }

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name || usernameRaw
      });
    } catch (e) {
      return sendError(res, 500, e?.message || "No se pudo crear el usuario.");
    }

    const newUid = userRecord.uid;

    const profile = {
      name: name || usernameRaw,
      email,
      username: usernameRaw,
      role,
      createdAt: Date.now(),
      createdBy: callerUid
    };

    await admin.firestore().doc(`users/${newUid}`).set(profile);
    await usernameRef.set({ email, uid: newUid });

    return res.status(200).json({ ok: true, uid: newUid, email });
  });
