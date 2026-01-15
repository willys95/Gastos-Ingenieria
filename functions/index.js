/**
 * ARCHIVO: functions/index.js
 * Versión: Firebase Functions V2 (Modular)
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

// Configuración global: define la región aquí una sola vez
setGlobalOptions({ region: "us-central1" });

/**
 * Función: createUserAccount
 * Crea usuarios y asigna roles (Solo Admin)
 */
exports.createUserAccount = onCall(async (request) => {
  // 1. Verificar autenticación
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  // 2. Verificar rol de admin
  const callerRole = request.auth.token.role;
  if (callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Solo admin puede crear usuarios.");
  }

  // 3. Obtener datos
  const { name, email, username, password, role } = request.data;

  // Validaciones
  if (!name || !email || !username || !password || !role) {
    throw new HttpsError("invalid-argument", "Faltan datos obligatorios.");
  }
  if (String(password).length < 6) {
    throw new HttpsError("invalid-argument", "La contraseña debe tener 6+ caracteres.");
  }

  const usernameKey = String(username).trim().toLowerCase();
  const emailKey = String(email).trim().toLowerCase();
  const db = admin.firestore();

  // 4. Verificar username único en users
  const existing = await db
    .collection("users")
    .where("username", "==", usernameKey)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError("already-exists", "El usuario ya existe.");
  }

  // 5. Crear en Authentication
  userRecord = await admin.auth().createUser({
    email: emailKey,
    password: password,
    displayName: name,
  });

  // 6. Guardar perfil en Firestore
  await admin.auth().setCustomUserClaims(userRecord.uid, { role });

  await db.collection("users").doc(userRecord.uid).set({
    name,
    email: emailKey,
    username: usernameKey,
    role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, email: emailKey };
});

/**
 * Función: bootstrapAdmin
 * Ejecutar una vez para convertirte en admin
 */
const ADMIN_EMAILS = ["info@msauditores.co"]; // <--- TU CORREO AQUÍ

exports.bootstrapAdmin = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sin sesión.");

  const email = (request.auth.token.email || "").toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
    throw new HttpsError("permission-denied", "No autorizado.");
  }

  await admin.auth().setCustomUserClaims(request.auth.uid, { role: "admin" });
  
  // Asegurar que exista perfil en Firestore
  await admin.firestore().collection("users").doc(request.auth.uid).set({
    role: "admin",
    email: email,
    name: request.auth.token.name || "Admin",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true, message: "Ahora eres Admin" };
});