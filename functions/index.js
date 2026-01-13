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

exports.createUserAccount = functions
  .region("us-central1")
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB"
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const payload = data || {};
    const name = String(payload.name || "").trim();
    const usernameRaw = String(payload.username || "").trim();
    const password = String(payload.password || "");
    const role = String(payload.role || "").trim(); // "empleado" o "lider"

    if (!usernameRaw || !password || !role) {
      throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios.");
    }
    if (password.length < 6) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "La contraseña debe tener mínimo 6 caracteres."
      );
    }

    const usernameKey = usernameRaw.toLowerCase();

    const email = payload.email
      ? String(payload.email).trim().toLowerCase()
      : toInternalEmail(usernameKey);

    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Username inválido para generar email interno."
      );
    }

    const callerUid = context.auth.uid;
    const callerSnap = await admin.firestore().doc(`users/${callerUid}`).get();

    if (!callerSnap.exists) {
      throw new functions.https.HttpsError("permission-denied", "Tu perfil no existe en /users.");
    }

    const callerRole = callerSnap.data().role;

    if (callerRole === "lider" && role !== "empleado") {
      throw new functions.https.HttpsError("permission-denied", "Un líder solo puede crear empleados.");
    }
    if (callerRole !== "admin" && callerRole !== "lider") {
      throw new functions.https.HttpsError("permission-denied", "Sin permisos para crear usuarios.");
    }

    const usernameRef = admin.firestore().doc(`usernames/${usernameKey}`);
    const usernameDoc = await usernameRef.get();
    if (usernameDoc.exists) {
      throw new functions.https.HttpsError("already-exists", "Username ya está en uso.");
    }

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name || usernameRaw
      });
    } catch (e) {
      throw new functions.https.HttpsError("internal", e?.message || "No se pudo crear el usuario.");
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

    return { ok: true, uid: newUid, email };
  });
