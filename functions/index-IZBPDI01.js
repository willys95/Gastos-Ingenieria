const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Lookup privado: username -> email
exports.lookupUsername = functions.https.onCall(async (data) => {
  const raw = String(data?.username || "").trim();
  if (!raw) {
    throw new functions.https.HttpsError("invalid-argument", "username requerido");
  }

  const username = raw.toLowerCase();

  const docRef = admin.firestore().collection("usernames").doc(username);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Usuario no encontrado");
  }

  const payload = snap.data() || {};
  const email = payload.email;

  if (!email) {
    throw new functions.https.HttpsError("failed-precondition", "Usuario sin email asociado");
  }

  // ✅ Solo devolvemos email y role (no datos sensibles)
  return { email, role: payload.role || "empleado" };
});
