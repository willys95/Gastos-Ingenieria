// ===== Firebase bootstrap (FIJO a us-central1) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

// 👇 firebaseConfig REAL
const firebaseConfig = {
  apiKey: "AIzaSyAOR0mDTR_MAULqNioSdgRH8IoDv_Lp4rI",
  authDomain: "ingenieria-sas.firebaseapp.com",
  projectId: "ingenieria-sas",
  storageBucket: "ingenieria-sas.firebasestorage.app",
  messagingSenderId: "856625753506",
  appId: "1:856625753506:web:68fbe9c28a79ee703756fb",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");

// Exponemos helpers
window.__fb = {
  app,
  auth,
  db,
  functions,

  // Auth
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,

  // Firestore
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,

  // Functions
  httpsCallable,
};

console.log("✅ Firebase listo. Functions region:", window.__fb?.functions?._region || "N/A");

const FUNCTIONS_REGION = window.__fb?.functions?._region || "us-central1";
const FUNCTIONS_PROJECT_ID = window.__fb?.functions?.app?.options?.projectId;
const CREATE_USER_URL = FUNCTIONS_PROJECT_ID
  ? `https://${FUNCTIONS_REGION}-${FUNCTIONS_PROJECT_ID}.cloudfunctions.net/createUserAccount`
  : "https://us-central1-ingenieria-sas.cloudfunctions.net/createUserAccount";

// ===================== CONFIG =====================
const CONFIG = {
  sheetId: "1tLdiGfhlSR0jsXT89jk-dDGfhci-Y3IAiECoR2g5RCo",
  driveFolderId: "1Q7mcMtEQoccD5gfux4TXNi9zY9qnIiXf",
  appsScriptUrl: "",
  appsScriptToken: "",
};

const STORAGE_KEY = "gastos-ingenieria-state";
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const SESSION_KEY = "gastos-ingenieria-session";

const defaultState = {
  currentUser: null,
  users: [],
  clients: [],
  projects: [],
  expenses: [],
  concepts: [
    "Seguridad Social",
    "Transporte",
    "Alimentación",
    "Hospedaje",
    "Compra de materiales",
    "Pago a terceros",
    "Impuestos",
    "Servicios",
    "Viáticos",
    "Prestamos",
    "Nomina",
  ],
  supports: ["Factura Electrónica", "Cuenta de cobro", "Tiquete", "Otro Documentos"],
  currentView: "dashboard",
};

let state = loadState();
let sessionTimeoutId = null;

// ===================== DOM =====================
const driveFolderEl = document.getElementById("drive-folder");
const sheetStatusEl = document.getElementById("sheet-status");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const resetPasswordButton = document.getElementById("reset-password");
const logoutButton = document.getElementById("logout-button");
const userSummary = document.getElementById("user-summary");
const navButtons = document.querySelectorAll(".nav__item");
const clientsNav = document.getElementById("clients-nav");
const projectsNav = document.getElementById("projects-nav");
const views = document.querySelectorAll(".view");
const usersNav = document.getElementById("users-nav");
const viewTitle = document.getElementById("view-title");
const viewSubtitle = document.getElementById("view-subtitle");
const viewEyebrow = document.getElementById("view-eyebrow");
const syncButton = document.getElementById("sync-button");
const exportButton = document.getElementById("export-button");
const menuToggle = document.getElementById("menu-toggle");
const pageEl = document.querySelector(".page");
const sidebar = document.getElementById("sidebar");
const mainHeader = document.querySelector(".main__header");
const mainNav = document.getElementById("main-nav");
const sidebarMeta = document.getElementById("sidebar-meta");

const statClients = document.getElementById("stat-clients");
const statProjects = document.getElementById("stat-projects");
const statBase = document.getElementById("stat-base");
const statRemaining = document.getElementById("stat-remaining");

const balancesEl = document.getElementById("balances");
const recentExpensesEl = document.getElementById("recent-expenses");

const clientForm = document.getElementById("client-form");
const clientMessage = document.getElementById("client-message");
const clientList = document.getElementById("client-list");

const projectForm = document.getElementById("project-form");
const projectMessage = document.getElementById("project-message");
const projectClient = document.getElementById("project-client");
const projectResponsible = document.getElementById("project-responsible");
const projectNotes = document.getElementById("project-notes");
const projectList = document.getElementById("project-list");

const expenseForm = document.getElementById("expense-form");
const expenseClient = document.getElementById("expense-client");
const expenseProject = document.getElementById("expense-project");
const expenseCity = document.getElementById("expense-city");
const expenseRemaining = document.getElementById("expense-remaining");
const expenseCategory = document.getElementById("expense-category");
const expenseSupport = document.getElementById("expense-support");
const expenseWarning = document.getElementById("expense-warning");
const expenseMessage = document.getElementById("expense-message");
const expenseTable = document.getElementById("expense-table");
const receiptInput = document.getElementById("expense-receipt");
const receiptPreview = document.getElementById("receipt-preview");
const expenseNotes = document.getElementById("expense-notes");

const conceptCard = document.getElementById("concept-card");
const conceptForm = document.getElementById("concept-form");
const conceptMessage = document.getElementById("concept-message");
const conceptNameInput = document.getElementById("concept-name");

const userForm = document.getElementById("user-form");
const userMessage = document.getElementById("user-message");
const userList = document.getElementById("user-list");
const adminSection = document.getElementById("admin-section");
const projectCodeInput = document.getElementById("project-code");
const projectCityInput = document.getElementById("project-city");

const folderUrl = `https://drive.google.com/drive/folders/${CONFIG.driveFolderId}`;

// ===================== Helpers estado/sesión =====================
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    return { ...structuredClone(defaultState), ...parsed, currentUser: null };
  } catch (error) {
    console.error("Error leyendo el estado local", error);
    return structuredClone(defaultState);
  }
}
function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function persistSession(user, expiresAt) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ user, expiresAt: expiresAt ?? Date.now() + SESSION_TIMEOUT_MS })
  );
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function isSessionValid(session) {
  return Boolean(session?.user && session?.expiresAt && Date.now() < session.expiresAt);
}
function scheduleSessionExpiry(expiresAt) {
  if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
  if (!expiresAt) return;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return handleSessionExpired();
  sessionTimeoutId = window.setTimeout(handleSessionExpired, remaining);
}
function handleSessionExpired() {
  clearSession();
  state.currentUser = null;
  persistState();
  updateView();
  if (window.__fb?.auth && window.__fb?.signOut) {
    window.__fb.signOut(window.__fb.auth).catch(console.error);
  }
}
async function refreshFirebaseToken(force = false) {
  const currentUser = window.__fb?.auth?.currentUser;
  if (!currentUser?.getIdToken) return;
  try {
    await currentUser.getIdToken(force);
  } catch (e) {
    console.warn("No fue posible refrescar token", e);
  }
}
function attachActivityListeners() {
  const refresh = () => {
    if (!state.currentUser) return;
    const current = readSession();
    persistSession(current?.user || state.currentUser);
    scheduleSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);
  };
  ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, refresh, { passive: true })
  );
}

// ===================== UI utils =====================
function setStatusMessage(target, message, variant) {
  if (!target) return;
  target.textContent = message;
  target.classList.remove("is-error", "is-success", "is-loading");
  if (variant) target.classList.add(`is-${variant}`);
}
function getSheetStatusLabel() {
  if (!CONFIG.appsScriptUrl || !CONFIG.appsScriptToken) {
    return "Modo local · Configura Apps Script para sincronizar";
  }
  return "Conectado a Google Sheets";
}
function updateHeader(viewName) {
  const headerMap = {
    dashboard: {
      eyebrow: "Panel general",
      title: "Resumen operativo",
      subtitle: "Visualiza el estado de las cajas menores y los últimos egresos registrados.",
    },
    clients: { eyebrow: "Clientes", title: "Gestión de clientes", subtitle: "Registra nuevas empresas y controla sus proyectos asociados." },
    projects: { eyebrow: "Proyectos", title: "Cajas menores por proyecto", subtitle: "Asigna códigos, ciudades y bases iniciales a cada proyecto." },
    expenses: { eyebrow: "Egresos", title: "Registro de gastos", subtitle: "Adjunta el soporte fotográfico y controla el saldo disponible." },
    reports: { eyebrow: "Reportes", title: "Reportes y sincronización", subtitle: "Centraliza los respaldos y exporta los egresos cuando lo necesites." },
    users: { eyebrow: "Usuarios", title: "Administración de usuarios", subtitle: "Define accesos y roles dentro del aplicativo." },
  };
  const cfg = headerMap[viewName] || headerMap.dashboard;
  viewEyebrow.textContent = cfg.eyebrow;
  viewTitle.textContent = cfg.title;
  viewSubtitle.textContent = cfg.subtitle;
}
function setActiveView(viewName) {
  state.currentView = viewName;
  persistState();
  views.forEach((v) => v.classList.toggle("is-active", v.dataset.view === viewName));
  navButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.view === viewName));
  updateHeader(viewName);
}
function updateDeviceClass() {
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  document.body.classList.toggle("is-mobile", isMobile);
}

// ===================== Permisos =====================
function getCurrentRole() {
  return state.currentUser?.role || "empleado";
}
function isAdmin() {
  return getCurrentRole() === "admin";
}
function isLeader() {
  return getCurrentRole() === "lider";
}
function canManageProjects() {
  return isAdmin() || isLeader();
}
function canManageUsers() {
  return isAdmin() || isLeader();
}
function canExport() {
  return isAdmin();
}

// ===================== Render / data =====================
function calculateProjectBalance(projectId) {
  const project = state.projects.find((i) => i.id === projectId);
  if (!project) return 0;
  const spent = state.expenses
    .filter((e) => e.projectId === projectId)
    .reduce((t, e) => t + e.amount, 0);
  return project.baseAmount - spent;
}
function isProjectVisibleToUser(project) {
  if (!project) return false;
  if (isAdmin() || isLeader()) return true;
  const username = state.currentUser?.username?.toLowerCase();
  const email = state.currentUser?.email?.toLowerCase();
  return (
    (username && project.responsibleUsername?.toLowerCase() === username) ||
    (email && project.responsibleEmail?.toLowerCase() === email) ||
    (username && project.responsibleName?.toLowerCase() === username)
  );
}
function getVisibleProjects() {
  return state.projects.filter(isProjectVisibleToUser);
}
function getVisibleProjectIds() {
  return new Set(getVisibleProjects().map((p) => p.id));
}
function renderSelect(selectEl, items, placeholder, getLabel, selectedId) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  selectEl.append(empty);
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = getLabel ? getLabel(item) : item.name;
    if (selectedId && opt.value === selectedId) opt.selected = true;
    selectEl.append(opt);
  });
}
function renderSimpleSelect(selectEl, items, placeholder) {
  if (!selectEl) return;
  const selected = selectEl.value;
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  selectEl.append(empty);
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    if (selected && opt.value === selected) opt.selected = true;
    selectEl.append(opt);
  });
}
function renderClients() {
  clientList.innerHTML = "";
  if (!state.clients.length) {
    clientList.innerHTML = '<p class="form__helper">Aún no hay clientes registrados.</p>';
    return;
  }
  state.clients.forEach((client) => {
    const projectCount = state.projects.filter((p) => p.clientId === client.id).length;
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${client.name}</span>
        <span>${projectCount} proyectos</span>
      </div>
      <div class="list-item__meta">${client.city}</div>
      ${client.contact ? `<div class="list-item__meta">${client.contact}</div>` : ""}
    `;
    clientList.append(item);
  });
}
function renderProjects() {
  projectList.innerHTML = "";
  if (!state.projects.length) {
    projectList.innerHTML = '<p class="form__helper">Aún no hay proyectos registrados.</p>';
    return;
  }
  state.projects.forEach((project) => {
    const remaining = calculateProjectBalance(project.id);
    const statusValue = project.status || "activo";
    const isInactive = remaining <= 0 || statusValue === "inactivo";
    const statusLabel = isInactive ? "Inactivo" : "Activo";
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${project.code} · ${project.name}</span>
        <span>$${remaining.toLocaleString()}</span>
      </div>
      <div class="list-item__meta">${project.clientName} · ${project.city}</div>
      <div class="list-item__meta">Responsable: ${project.responsibleName || "Sin asignar"}</div>
      <div class="list-item__meta">Base inicial: $${project.baseAmount.toLocaleString()}</div>
      <div class="list-item__meta">
        Estado:
        ${
          canManageProjects()
            ? `<select class="status-select" data-project="${project.id}">
                <option value="activo" ${statusValue === "activo" ? "selected" : ""}>Activo</option>
                <option value="inactivo" ${statusValue === "inactivo" ? "selected" : ""}>Inactivo</option>
              </select>`
            : `<span class="status-pill ${isInactive ? "is-inactive" : ""}">${statusLabel}</span>`
        }
      </div>
      ${project.notes ? `<div class="list-item__meta">Observaciones: ${project.notes}</div>` : ""}
    `;
    projectList.append(item);
  });
}
function renderBalances() {
  balancesEl.innerHTML = "";
  const visible = getVisibleProjects();
  if (!visible.length) {
    balancesEl.innerHTML = '<p class="form__helper">Aún no hay cajas creadas.</p>';
    return;
  }
  visible.forEach((project) => {
    const remaining = calculateProjectBalance(project.id);
    const statusValue = project.status || "activo";
    const isInactive = remaining <= 0 || statusValue === "inactivo";
    const status = isInactive ? "Inactivo" : "Activo";
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${project.clientName}</span>
        <span class="status-pill ${isInactive ? "is-inactive" : ""}">${status}</span>
      </div>
      <div class="list-item__meta">Proyecto ${project.code} · ${project.name}</div>
      <div class="list-item__meta">${project.city} · Saldo $${remaining.toLocaleString()}</div>
    `;
    balancesEl.append(item);
  });
}
function renderExpenses() {
  expenseTable.innerHTML = "";
  const visibleIds = getVisibleProjectIds();
  const visibleExpenses =
    isAdmin() || isLeader() ? state.expenses : state.expenses.filter((e) => visibleIds.has(e.projectId));

  if (!visibleExpenses.length) {
    expenseTable.innerHTML = '<p class="form__helper">No hay egresos registrados.</p>';
    return;
  }

  expenseTable.innerHTML = [...visibleExpenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((e) => {
      return `
        <div class="list-item">
          <div class="list-item__header">
            <span>${e.category}</span>
            <span>$${e.amount.toLocaleString()}</span>
          </div>
          <div class="list-item__meta">${e.date} · ${e.projectName}</div>
          <div class="list-item__meta">${e.clientName} · ${e.city}</div>
          <div class="list-item__meta">${e.description}</div>
          ${e.notes ? `<div class="list-item__meta">Observaciones: ${e.notes}</div>` : ""}
          <div class="list-item__meta">Soporte: ${e.supportType || "Sin definir"}</div>
          <div class="list-item__meta">
            Comprobante: ${
              e.receiptUrl
                ? `<a class="link" href="${e.receiptUrl}" target="_blank" rel="noreferrer">${e.receiptName}</a>`
                : e.receiptName || "Sin archivo"
            }
          </div>
        </div>
      `;
    })
    .join("");
}
function renderRecentExpenses() {
  recentExpensesEl.innerHTML = "";
  const visibleIds = getVisibleProjectIds();
  const visibleExpenses =
    isAdmin() || isLeader() ? state.expenses : state.expenses.filter((e) => visibleIds.has(e.projectId));

  if (!visibleExpenses.length) {
    recentExpensesEl.innerHTML = '<p class="form__helper">No hay egresos registrados.</p>';
    return;
  }

  recentExpensesEl.innerHTML = [...visibleExpenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map((e) => {
      return `
        <div class="list-item">
          <div class="list-item__header">
            <span>${e.category}</span>
            <span>$${e.amount.toLocaleString()}</span>
          </div>
          <div class="list-item__meta">${e.projectName} · ${e.clientName}</div>
          <div class="list-item__meta">${e.date}</div>
        </div>
      `;
    })
    .join("");
}
function renderUsers() {
  userList.innerHTML = "";
  if (!state.users.length) {
    userList.innerHTML = '<p class="form__helper">No hay usuarios registrados.</p>';
    return;
  }
  state.users.forEach((u) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${u.name}</span>
        <span>${u.role}</span>
      </div>
      <div class="list-item__meta">Usuario: ${u.username}</div>
      ${u.email ? `<div class="list-item__meta">Correo: ${u.email}</div>` : ""}
    `;
    userList.append(item);
  });
}
function renderStats() {
  const visibleProjects = getVisibleProjects();
  const visibleClientIds = new Set(visibleProjects.map((p) => p.clientId));
  statClients.textContent = isAdmin() || isLeader() ? state.clients.length : visibleClientIds.size;
  statProjects.textContent = visibleProjects.length;

  const totalBase = visibleProjects.reduce((sum, p) => sum + p.baseAmount, 0);
  const totalRemaining = visibleProjects.reduce((sum, p) => sum + calculateProjectBalance(p.id), 0);

  statBase.textContent = `$${totalBase.toLocaleString()}`;
  statRemaining.textContent = `$${totalRemaining.toLocaleString()}`;
}
function updateExpenseAvailability() {
  const projectId = expenseProject.value;
  const project = state.projects.find((i) => i.id === projectId);
  const remaining = projectId ? calculateProjectBalance(projectId) : null;
  const statusValue = project?.status || "activo";
  const isInactive = project ? statusValue === "inactivo" || remaining <= 0 : false;

  expenseRemaining.value = remaining !== null ? `$${remaining.toLocaleString()}` : "";

  if (remaining !== null && isInactive) {
    expenseWarning.textContent =
      remaining <= 0 ? "La caja está en $0. No es posible registrar más egresos."
                     : "El proyecto está inactivo. No es posible registrar egresos.";
    expenseWarning.classList.add("is-visible");
  } else {
    expenseWarning.textContent = "";
    expenseWarning.classList.remove("is-visible");
  }

  const btn = expenseForm.querySelector("button");
  if (btn) btn.disabled = remaining !== null && isInactive;
}
function renderOptions() {
  renderSelect(projectClient, state.clients, "Seleccione un cliente", null, projectClient.value);

  const visibleProjects = state.projects.filter(isProjectVisibleToUser);
  const visibleClientIds = new Set(visibleProjects.map((p) => p.clientId));
  const filteredClients =
    isAdmin() || isLeader() ? state.clients : state.clients.filter((c) => visibleClientIds.has(c.id));

  renderSelect(expenseClient, filteredClients, "Seleccione un cliente", null, expenseClient.value);

  const selectedClientId = expenseClient.value;
  const projects = visibleProjects.filter((p) => p.clientId === selectedClientId);
  renderSelect(
    expenseProject,
    projects,
    "Seleccione un proyecto",
    (item) => `${item.code} · ${item.responsibleName || "Sin responsable"}`,
    expenseProject.value
  );

  const selectedProject = state.projects.find((p) => p.id === expenseProject.value);
  const cityOptions = Array.from(new Set(state.clients.map((c) => c.city).filter(Boolean)));
  renderSimpleSelect(expenseCity, cityOptions, "Seleccione una ciudad");

  if (selectedProject?.city) {
    expenseCity.value = selectedProject.city;
  } else {
    const selectedClient = state.clients.find((c) => c.id === selectedClientId);
    expenseCity.value = selectedClient?.city || expenseCity.value;
  }

  updateExpenseAvailability();

  renderSimpleSelect(expenseCategory, state.concepts, "Seleccione un concepto");
  renderSimpleSelect(expenseSupport, state.supports, "Seleccione el soporte");

  const availableUsers = state.users.filter((u) => u.role === "empleado");
  renderSelect(projectResponsible, availableUsers, "Seleccione un responsable", (i) => i.name, projectResponsible?.value);
}

// ===================== Firestore sync =====================
async function syncUsersFromFirestore() {
  if (!window.__fb?.db || !window.__fb?.collection || !window.__fb?.getDocs) return;
  try {
    await refreshFirebaseToken(true);
    const snap = await window.__fb.getDocs(window.__fb.collection(window.__fb.db, "users"));
    state.users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    persistState();
  } catch (e) {
    console.error("No fue posible leer usuarios desde Firestore.", e);
  }
}

// ===================== Drive link =====================
function initDriveFolder() {
  if (!driveFolderEl) return;
  driveFolderEl.innerHTML = "";
  const a = document.createElement("a");
  a.href = folderUrl;
  a.textContent = CONFIG.driveFolderId;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.className = "link";
  driveFolderEl.append(a);
}

// ===================== View =====================
function updateView() {
  const isLoggedIn = Boolean(state.currentUser);
  loginSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);
  document.getElementById("user-card").classList.toggle("hidden", !isLoggedIn);
  mainHeader?.classList.toggle("hidden", !isLoggedIn);
  mainNav?.classList.toggle("hidden", !isLoggedIn);
  sidebarMeta?.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) return;

  userSummary.textContent = `${state.currentUser.name} · ${state.currentUser.role}`;
  usersNav.classList.toggle("hidden", !canManageUsers());
  adminSection.classList.toggle("hidden", !canManageUsers());
  clientsNav.classList.toggle("hidden", !canManageProjects());
  projectsNav.classList.toggle("hidden", !canManageProjects());
  clientForm.classList.toggle("hidden", !canManageProjects());
  projectForm.classList.toggle("hidden", !canManageProjects());
  conceptCard.classList.toggle("hidden", !isAdmin());
  exportButton?.classList.toggle("hidden", !canExport());

  if (!canManageUsers() && state.currentView === "users") state.currentView = "dashboard";
  if (!canManageProjects() && (state.currentView === "clients" || state.currentView === "projects")) state.currentView = "dashboard";

  renderOptions();
  renderStats();
  renderBalances();
  renderProjects();
  renderClients();
  renderExpenses();
  renderRecentExpenses();
  renderUsers();

  setActiveView(state.currentView || "dashboard");
}

// ===================== Upload preview =====================
function handleReceiptPreview(file) {
  receiptPreview.innerHTML = "";
  if (!file) {
    receiptPreview.textContent = "Sin archivo seleccionado";
    return;
  }
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.alt = "Vista previa del comprobante";
  const label = document.createElement("span");
  label.className = "file-preview__label";
  label.textContent = file.name;
  receiptPreview.append(img, label);
}

// ===================== Auth listener =====================
function attachAuthListener() {
  if (!window.__fb?.onAuthStateChanged || !window.__fb?.auth) return;

  window.__fb.onAuthStateChanged(window.__fb.auth, async (user) => {
    if (!user) {
      const session = readSession();
      if (isSessionValid(session)) {
        state.currentUser = session.user;
        persistState();
        scheduleSessionExpiry(session.expiresAt);
        updateView();
        return;
      }
      state.currentUser = null;
      clearSession();
      persistState();
      updateView();
      return;
    }

    try {
      const ref = window.__fb.doc(window.__fb.db, "users", user.uid);
      const snap = await window.__fb.getDoc(ref);
      const profile = snap.exists() ? snap.data() : null;

      state.currentUser = {
        id: user.uid,
        name: profile?.name || user.email || "usuario",
        username: profile?.username || "",
        email: profile?.email || user.email || "",
        role: profile?.role || "empleado",
      };

      persistState();
      persistSession(state.currentUser);
      scheduleSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);

      await syncUsersFromFirestore();
      updateView();
    } catch (err) {
      console.error("No fue posible cargar el perfil del usuario.", err);
      state.currentUser = { id: user.uid, name: user.email || "usuario", username: "", email: user.email || "", role: "empleado" };
      persistState();
      persistSession(state.currentUser);
      scheduleSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);
      updateView();
    }
  });
}

// ===================== Eventos =====================
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const inputUser = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  try {
    setStatusMessage(loginMessage, "Validando...", "loading");

    if (!window.__fb?.auth) {
      setStatusMessage(loginMessage, "Firebase no está inicializado (revisa firebaseConfig).", "error");
      return;
    }

    let email = inputUser;
    if (!inputUser.includes("@")) {
      const usernameKey = inputUser.toLowerCase();
      const ref = window.__fb.doc(window.__fb.db, "usernames", usernameKey);
      const snap = await window.__fb.getDoc(ref);
      if (!snap.exists() || !snap.data()?.email) {
        setStatusMessage(loginMessage, "Usuario no encontrado.", "error");
        return;
      }
      email = snap.data().email;
    }

    const cred = await window.__fb.signInWithEmailAndPassword(window.__fb.auth, email, password);

    const uid = cred.user.uid;
    const userRef = window.__fb.doc(window.__fb.db, "users", uid);
    const userSnap = await window.__fb.getDoc(userRef);

    let profile = null;
    if (userSnap.exists()) {
      profile = userSnap.data();
    } else {
      profile = {
        name: cred.user.email || "usuario",
        email: cred.user.email || "",
        username: inputUser.includes("@") ? "" : inputUser,
        role: "empleado",
        createdAt: Date.now(),
      };
      await window.__fb.setDoc(userRef, profile);
    }

    state.currentUser = {
      id: uid,
      name: profile.name || (cred.user.email || "usuario"),
      username: profile.username || (inputUser.includes("@") ? "" : inputUser),
      email: profile.email || (cred.user.email || ""),
      role: profile.role || "empleado",
    };

    setStatusMessage(loginMessage, "", "");
    loginForm.reset();
    persistState();
    persistSession(state.currentUser);
    scheduleSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);

    await syncUsersFromFirestore();
    updateView();
  } catch (e) {
    console.error(e);
    setStatusMessage(loginMessage, "Credenciales inválidas.", "error");
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    if (window.__fb?.auth && window.__fb?.signOut) await window.__fb.signOut(window.__fb.auth);
  } catch (e) {
    console.error(e);
  }
  state.currentUser = null;
  clearSession();
  persistState();
  updateView();
});

resetPasswordButton?.addEventListener("click", async () => {
  const inputUser = document.getElementById("login-username").value.trim();
  if (!inputUser) {
    setStatusMessage(loginMessage, "Escribe tu correo o usuario para restablecer.", "error");
    return;
  }
  try {
    let email = inputUser;
    if (!email.includes("@")) {
      const usernameKey = inputUser.toLowerCase();
      const snap = await window.__fb.getDoc(window.__fb.doc(window.__fb.db, "usernames", usernameKey));
      if (!snap.exists()) {
        setStatusMessage(loginMessage, "Usuario no encontrado.", "error");
        return;
      }
      email = snap.data().email;
    }

    await window.__fb.sendPasswordResetEmail(window.__fb.auth, email);
    setStatusMessage(loginMessage, "Te enviamos un correo para restablecer la contraseña.", "success");
  } catch (e) {
    console.error(e);
    setStatusMessage(loginMessage, "No fue posible enviar el correo de restablecimiento.", "error");
  }
});

// Menú responsive
function closeMenu() {
  sidebar.classList.remove("is-open");
  pageEl?.classList.remove("is-menu-open");
}
menuToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
  pageEl?.classList.toggle("is-menu-open");
});
pageEl?.addEventListener("click", (e) => {
  if (!pageEl.classList.contains("is-menu-open")) return;
  const insideSidebar = sidebar.contains(e.target);
  const onToggle = menuToggle && menuToggle.contains(e.target);
  if (!insideSidebar && !onToggle) closeMenu();
});
window.addEventListener("resize", updateDeviceClass);

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("hidden")) return;
    setActiveView(btn.dataset.view);
    closeMenu();
  });
});

expenseClient.addEventListener("change", renderOptions);
expenseProject.addEventListener("change", renderOptions);

projectList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (!target.classList.contains("status-select")) return;
  if (!canManageProjects()) return;
  const projectId = target.dataset.project;
  const project = state.projects.find((i) => i.id === projectId);
  if (!project) return;
  project.status = target.value;
  persistState();
  renderProjects();
  renderBalances();
  updateExpenseAvailability();
});

receiptInput.addEventListener("change", (event) => {
  handleReceiptPreview(event.target.files[0]);
});

// Crear usuario (✅ SOLO UN LISTENER)
userForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!canManageUsers()) {
    setStatusMessage(userMessage, "No tienes permisos para crear usuarios.", "error");
    return;
  }

  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const username = document.getElementById("user-username").value.trim();
  const password = document.getElementById("user-password").value.trim();

  const roleSelect = document.getElementById("user-role");
  let role = roleSelect ? roleSelect.value : "empleado";

  if (state.currentUser?.role === "lider") role = "empleado";

  if (!username) {
    setStatusMessage(userMessage, "El usuario (username) es obligatorio.", "error");
    return;
  }
  if (!password || password.length < 6) {
    setStatusMessage(userMessage, "La contraseña debe tener al menos 6 caracteres.", "error");
    return;
  }

  const usernameKey = username.toLowerCase();
  if (state.users.some((u) => (u.username || "").toLowerCase() === usernameKey)) {
    setStatusMessage(userMessage, "Ese username ya existe.", "error");
    return;
  }

  try {
    setStatusMessage(userMessage, "Creando usuario...", "loading");

    const authUser = window.__fb.auth.currentUser;
    if (!authUser) {
      throw new Error("Debes iniciar sesión para crear usuarios.");
    }

    const payload = { name, username, password, role };
    if (email) payload.email = email;

    const token = await authUser.getIdToken(true);
    const response = await fetch(CREATE_USER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseBody?.error?.message || "No se pudo crear el usuario.");
    }
    const res = responseBody;

    setStatusMessage(userMessage, `Usuario creado: ${username} (${res.email})`, "success");
    userForm.reset();

    await syncUsersFromFirestore();
    renderUsers();
    renderOptions();
  } catch (error) {
    console.error(error);
    setStatusMessage(userMessage, error?.message || "No se pudo crear el usuario.", "error");
  }
});

// ===================== Init =====================
function initApp() {
  initDriveFolder();
  setStatusMessage(sheetStatusEl, getSheetStatusLabel());
  updateDeviceClass();

  const session = readSession();
  if (isSessionValid(session)) {
    state.currentUser = session.user;
    persistState();
    scheduleSessionExpiry(session.expiresAt);
  }

  attachAuthListener();
  attachActivityListeners();
  updateView();
}

initApp();
