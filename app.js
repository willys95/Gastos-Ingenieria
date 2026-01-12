const CONFIG = {
  sheetId: "1tLdiGfhlSR0jsXT89jk-dDGfhci-Y3IAiECoR2g5RCo",
  driveFolderId: "1Q7mcMtEQoccD5gfux4TXNi9zY9qnIiXf",
  appsScriptUrl: "",
  appsScriptToken: "",
};

// ✅ Correos administradores (tendrán acceso a la vista "Usuarios")
const ADMIN_EMAILS = ["rodriguezwilly4@gmail.com"];
const LEADER_EMAILS = [];


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

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(defaultState);
  }
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      currentUser: null,
    };
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
  const payload = {
    user,
    expiresAt: expiresAt ?? Date.now() + SESSION_TIMEOUT_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error leyendo la sesión local", error);
    return null;
  }
}

function refreshSession() {
  const current = readSession();
  if (!current?.user) {
    return;
  }
  persistSession(current.user);
}

function isSessionValid(session) {
  return Boolean(session?.user && session?.expiresAt && Date.now() < session.expiresAt);
}

function scheduleSessionExpiry(expiresAt) {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
  if (!expiresAt) {
    return;
  }
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    handleSessionExpired();
    return;
  }
  sessionTimeoutId = window.setTimeout(() => {
    handleSessionExpired();
  }, remaining);
}

function handleSessionExpired() {
  clearSession();
  state.currentUser = null;
  persistState();
  updateView();
  if (window.__fb?.auth && window.__fb?.signOut) {
    window.__fb.signOut(window.__fb.auth).catch((error) => {
      console.error("No fue posible cerrar sesión en Firebase.", error);
    });
  }
}

async function refreshFirebaseToken(force = false) {
  const currentUser = window.__fb?.auth?.currentUser;
  if (!currentUser?.getIdToken) {
    return;
  }
  try {
    await currentUser.getIdToken(force);
  } catch (error) {
    console.warn("No fue posible refrescar el token de Firebase.", error);
  }
}

function attachActivityListeners() {
  const refresh = () => {
    if (!state.currentUser) {
      return;
    }
    const current = readSession();
    const baseUser = current?.user || state.currentUser;
    persistSession(baseUser);
    scheduleSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);
  };
  ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, refresh, { passive: true });
  });
}


function downloadCsv(filename, rows) {
  const escape = (value) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setStatusMessage(target, message, variant) {
  if (!target) {
    return;
  }
  target.textContent = message;
  target.classList.remove("is-error", "is-success", "is-loading");
  if (variant) {
    target.classList.add(`is-${variant}`);
  }
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
    clients: {
      eyebrow: "Clientes",
      title: "Gestión de clientes",
      subtitle: "Registra nuevas empresas y controla sus proyectos asociados.",
    },
    projects: {
      eyebrow: "Proyectos",
      title: "Cajas menores por proyecto",
      subtitle: "Asigna códigos, ciudades y bases iniciales a cada proyecto.",
    },
    expenses: {
      eyebrow: "Egresos",
      title: "Registro de gastos",
      subtitle: "Adjunta el soporte fotográfico y controla el saldo disponible.",
    },
    reports: {
      eyebrow: "Reportes",
      title: "Reportes y sincronización",
      subtitle: "Centraliza los respaldos y exporta los egresos cuando lo necesites.",
    },
    users: {
      eyebrow: "Usuarios",
      title: "Administración de usuarios",
      subtitle: "Define accesos y roles dentro del aplicativo.",
    },
  };
  const config = headerMap[viewName] || headerMap.dashboard;
  viewEyebrow.textContent = config.eyebrow;
  viewTitle.textContent = config.title;
  viewSubtitle.textContent = config.subtitle;
}

function setActiveView(viewName) {
  state.currentView = viewName;
  persistState();
  views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
  updateHeader(viewName);
}

function calculateProjectBalance(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) {
    return 0;
  }
  const spent = state.expenses
    .filter((expense) => expense.projectId === projectId)
    .reduce((total, expense) => total + expense.amount, 0);
  return project.baseAmount - spent;
}

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
  return isAdmin();
}

function canExport() {
  return isAdmin();
}

function getUserMatch(email, username) {
  const safeEmail = email?.toLowerCase();
  const safeUsername = username?.toLowerCase();
  return state.users.find((user) => {
    const emailMatch = user.email && safeEmail && user.email.toLowerCase() === safeEmail;
    const usernameMatch = safeUsername && user.username?.toLowerCase() === safeUsername;
    return emailMatch || usernameMatch;
  });
}

function isProjectVisibleToUser(project) {
  if (!project) {
    return false;
  }
  if (isAdmin() || isLeader()) {
    return true;
  }
  const username = state.currentUser?.username?.toLowerCase();
  const email = state.currentUser?.email?.toLowerCase();
  return (
    (username && project.responsibleUsername?.toLowerCase() === username) ||
    (email && project.responsibleEmail?.toLowerCase() === email) ||
    (username && project.responsibleName?.toLowerCase() === username)
  );
}

function getVisibleProjects() {
  return state.projects.filter((project) => isProjectVisibleToUser(project));
}

function getVisibleProjectIds() {
  return new Set(getVisibleProjects().map((project) => project.id));
}

function updateDeviceClass() {
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  document.body.classList.toggle("is-mobile", isMobile);
}

function renderSelect(selectEl, items, placeholder, getLabel, selectedId) {
  if (!selectEl) {
    return;
  }
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  selectEl.append(empty);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = getLabel ? getLabel(item) : item.name;
    if (selectedId && option.value === selectedId) {
      option.selected = true;
    }
    selectEl.append(option);
  });
}

function renderClients() {
  clientList.innerHTML = "";
  if (!state.clients.length) {
    clientList.innerHTML = '<p class="form__helper">Aún no hay clientes registrados.</p>';
    return;
  }
  state.clients.forEach((client) => {
    const projectCount = state.projects.filter((project) => project.clientId === client.id).length;
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
  const visibleProjects = getVisibleProjects();
  if (!visibleProjects.length) {
    balancesEl.innerHTML = '<p class="form__helper">Aún no hay cajas creadas.</p>';
    return;
  }
  visibleProjects.forEach((project) => {
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
  const visibleProjectIds = getVisibleProjectIds();
  const visibleExpenses = isAdmin() || isLeader()
    ? state.expenses
    : state.expenses.filter((expense) => visibleProjectIds.has(expense.projectId));
  if (!visibleExpenses.length) {
    expenseTable.innerHTML = '<p class="form__helper">No hay egresos registrados.</p>';
    return;
  }
  const rows = [...visibleExpenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((expense) => {
      return `
        <div class="list-item">
          <div class="list-item__header">
            <span>${expense.category}</span>
            <span>$${expense.amount.toLocaleString()}</span>
          </div>
          <div class="list-item__meta">${expense.date} · ${expense.projectName}</div>
          <div class="list-item__meta">${expense.clientName} · ${expense.city}</div>
          <div class="list-item__meta">${expense.description}</div>
          ${expense.notes ? `<div class="list-item__meta">Observaciones: ${expense.notes}</div>` : ""}
          <div class="list-item__meta">Soporte: ${expense.supportType || "Sin definir"}</div>
          <div class="list-item__meta">
            Comprobante: ${
              expense.receiptUrl
                ? `<a class="link" href="${expense.receiptUrl}" target="_blank" rel="noreferrer">${expense.receiptName}</a>`
                : expense.receiptName || "Sin archivo"
            }
          </div>
        </div>
      `;
    })
    .join("");
  expenseTable.innerHTML = rows;
}

function renderRecentExpenses() {
  recentExpensesEl.innerHTML = "";
  const visibleProjectIds = getVisibleProjectIds();
  const visibleExpenses = isAdmin() || isLeader()
    ? state.expenses
    : state.expenses.filter((expense) => visibleProjectIds.has(expense.projectId));
  if (!visibleExpenses.length) {
    recentExpensesEl.innerHTML = '<p class="form__helper">No hay egresos registrados.</p>';
    return;
  }
  const rows = [...visibleExpenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map((expense) => {
      return `
        <div class="list-item">
          <div class="list-item__header">
            <span>${expense.category}</span>
            <span>$${expense.amount.toLocaleString()}</span>
          </div>
          <div class="list-item__meta">${expense.projectName} · ${expense.clientName}</div>
          <div class="list-item__meta">${expense.date}</div>
        </div>
      `;
    })
    .join("");
  recentExpensesEl.innerHTML = rows;
}

function renderUsers() {
  userList.innerHTML = "";
  if (!state.users.length) {
    userList.innerHTML = '<p class="form__helper">No hay usuarios registrados.</p>';
    return;
  }
  state.users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${user.name}</span>
        <span>${user.role}</span>
      </div>
      <div class="list-item__meta">Usuario: ${user.username}</div>
      ${user.email ? `<div class="list-item__meta">Correo: ${user.email}</div>` : ""}
    `;
    userList.append(item);
  });
}

function updateExpenseAvailability() {
  const projectId = expenseProject.value;
  const project = state.projects.find((item) => item.id === projectId);
  const remaining = projectId ? calculateProjectBalance(projectId) : null;
  const statusValue = project?.status || "activo";
  const isInactive = project ? statusValue === "inactivo" || remaining <= 0 : false;
  if (remaining !== null) {
    expenseRemaining.value = `$${remaining.toLocaleString()}`;
  } else {
    expenseRemaining.value = "";
  }

  if (remaining !== null && isInactive) {
    expenseWarning.textContent =
      remaining <= 0
        ? "La caja está en $0. No es posible registrar más egresos."
        : "El proyecto está inactivo. No es posible registrar egresos.";
    expenseWarning.classList.add("is-visible");
  } else {
    expenseWarning.textContent = "";
    expenseWarning.classList.remove("is-visible");
  }

  const isBlocked = remaining !== null && isInactive;
  expenseForm.querySelector("button").disabled = isBlocked;
}

function renderStats() {
  const visibleProjects = getVisibleProjects();
  const visibleClientIds = new Set(visibleProjects.map((project) => project.clientId));
  statClients.textContent = isAdmin() || isLeader() ? state.clients.length : visibleClientIds.size;
  statProjects.textContent = visibleProjects.length;
  const totalBase = visibleProjects.reduce((sum, project) => sum + project.baseAmount, 0);
  const totalRemaining = visibleProjects.reduce(
    (sum, project) => sum + calculateProjectBalance(project.id),
    0,
  );
  statBase.textContent = `$${totalBase.toLocaleString()}`;
  statRemaining.textContent = `$${totalRemaining.toLocaleString()}`;
}

function renderOptions() {
  renderSelect(projectClient, state.clients, "Seleccione un cliente", null, projectClient.value);

  const visibleProjects = state.projects.filter((project) => isProjectVisibleToUser(project));
  const visibleClientIds = new Set(visibleProjects.map((project) => project.clientId));
  const filteredClients = isAdmin() || isLeader()
    ? state.clients
    : state.clients.filter((client) => visibleClientIds.has(client.id));

  renderSelect(expenseClient, filteredClients, "Seleccione un cliente", null, expenseClient.value);

  const selectedClientId = expenseClient.value;
  const projects = visibleProjects.filter((project) => project.clientId === selectedClientId);
  renderSelect(
    expenseProject,
    projects,
    "Seleccione un proyecto",
    (item) => `${item.code} · ${item.responsibleName || "Sin responsable"}`,
    expenseProject.value,
  );

  const selectedProject = state.projects.find((project) => project.id === expenseProject.value);
  const cityOptions = Array.from(
    new Set(state.clients.map((client) => client.city).filter(Boolean)),
  );
  renderSimpleSelect(expenseCity, cityOptions, "Seleccione una ciudad");
  if (selectedProject?.city) {
    expenseCity.value = selectedProject.city;
  } else {
    const selectedClient = state.clients.find((client) => client.id === selectedClientId);
    expenseCity.value = selectedClient?.city || expenseCity.value;
  }

  updateExpenseAvailability();

  renderSimpleSelect(expenseCategory, state.concepts, "Seleccione un concepto");
  renderSimpleSelect(expenseSupport, state.supports, "Seleccione el soporte");

  const availableUsers = state.users.filter((user) => user.role === "empleado");
  renderSelect(
    projectResponsible,
    availableUsers,
    "Seleccione un responsable",
    (item) => item.name,
    projectResponsible?.value,
  );

  updateProjectCodeSuggestion();
}

function updateView() {
  const isLoggedIn = Boolean(state.currentUser);
  loginSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);
  document.getElementById("user-card").classList.toggle("hidden", !isLoggedIn);
  mainHeader?.classList.toggle("hidden", !isLoggedIn);
  mainNav?.classList.toggle("hidden", !isLoggedIn);
  sidebarMeta?.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    return;
  }

  userSummary.textContent = `${state.currentUser.name} · ${state.currentUser.role}`;
  usersNav.classList.toggle("hidden", !canManageUsers());
  adminSection.classList.toggle("hidden", !canManageUsers());
  clientsNav.classList.toggle("hidden", !canManageProjects());
  projectsNav.classList.toggle("hidden", !canManageProjects());
  clientForm.classList.toggle("hidden", !canManageProjects());
  projectForm.classList.toggle("hidden", !canManageProjects());
  conceptCard.classList.toggle("hidden", !isAdmin());
  exportButton?.classList.toggle("hidden", !canExport());

  if (!canManageUsers() && state.currentView === "users") {
    state.currentView = "dashboard";
  }
  if (!canManageProjects() && (state.currentView === "clients" || state.currentView === "projects")) {
    state.currentView = "dashboard";
  }

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

async function syncUsersFromFirestore() {
  if (!window.__fb?.db || !window.__fb?.collection || !window.__fb?.getDocs) {
    return;
  }
  try {
    await refreshFirebaseToken(true);
    const snapshot = await window.__fb.getDocs(
      window.__fb.collection(window.__fb.db, "users")
    );

    state.users = snapshot.docs.map((docSnap) => ({
      id: docSnap.id, // uid real
      ...docSnap.data(),
    }));

    persistState();
  } catch (error) {
    console.error("No fue posible leer usuarios desde Firestore.", error);
  }
}

function renderSimpleSelect(selectEl, items, placeholder) {
  if (!selectEl) {
    return;
  }
  const selected = selectEl.value;
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  selectEl.append(empty);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    if (selected && option.value === selected) {
      option.selected = true;
    }
    selectEl.append(option);
  });
}

function normalizeCodeSegment(text) {
  return text
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 2))
    .join("")
    .slice(0, 6);
}

function getNextProjectSequence(clientId, city) {
  const citySegment = normalizeCodeSegment(city);
  const matching = state.projects.filter(
    (project) => project.clientId === clientId && normalizeCodeSegment(project.city) === citySegment,
  );
  const maxSequence = matching.reduce((max, project) => {
    const match = project.code?.match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return String(maxSequence + 1).padStart(3, "0");
}

function getSuggestedProjectCode() {
  const clientId = projectClient.value;
  const client = state.clients.find((item) => item.id === clientId);
  const city = projectCityInput.value.trim();
  if (!client || !city) {
    return "";
  }
  const clientSegment = normalizeCodeSegment(client.name);
  const citySegment = normalizeCodeSegment(city);
  const sequence = getNextProjectSequence(client.id, city);
  if (!clientSegment || !citySegment) {
    return "";
  }
  return `${clientSegment}-${citySegment}-${sequence}`;
}

function updateProjectCodeSuggestion() {
  if (!projectCodeInput) {
    return;
  }
  const shouldUpdate = !projectCodeInput.value || projectCodeInput.dataset.auto === "true";
  if (!shouldUpdate) {
    return;
  }
  const suggested = getSuggestedProjectCode();
  if (suggested) {
    projectCodeInput.value = suggested;
    projectCodeInput.dataset.auto = "true";
  }
}

function markProjectCodeManual() {
  projectCodeInput.dataset.auto = "false";
}

function isSyncEnabled() {
  return Boolean(CONFIG.appsScriptUrl && CONFIG.appsScriptToken);
}

async function apiRequest(action, payload) {
  const body = JSON.stringify({
    token: CONFIG.appsScriptToken,
    sheetId: CONFIG.sheetId,
    action,
    payload: payload ?? {},
  });
  const response = await fetch(CONFIG.appsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Error en Apps Script: ${response.status}`);
  }

  if (!result || result.ok === false) {
    const errorMessage = result?.error ? `Error en Apps Script: ${result.error}` : "Respuesta inválida.";
    throw new Error(errorMessage);
  }

  return result.data ?? result;
}

async function syncFromSheets() {
  if (!isSyncEnabled()) {
    return;
  }
  setStatusMessage(sheetStatusEl, "Sincronizando con Google Sheets...", "loading");
  try {
    const data = await apiRequest("bootstrap");
    const resolveCollection = (incoming, fallback) =>
      Array.isArray(incoming) && incoming.length ? incoming : fallback;
    state = {
      ...state,
      users: resolveCollection(data.users, state.users),
      clients: resolveCollection(data.clients, state.clients),
      projects: resolveCollection(data.projects, state.projects),
      expenses: resolveCollection(data.expenses, state.expenses),
      concepts: resolveCollection(data.concepts, state.concepts),
      supports: resolveCollection(data.supports, state.supports),
    };
    persistState();
    setStatusMessage(sheetStatusEl, "Datos actualizados desde Google Sheets.", "success");
    updateView();
  } catch (error) {
    console.error("Error sincronizando con Google Sheets", error);
    setStatusMessage(sheetStatusEl, "No fue posible sincronizar con Google Sheets.", "error");
  }
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No fue posible leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function handleReceiptPreview(file) {
  receiptPreview.innerHTML = "";
  if (!file) {
    receiptPreview.textContent = "Sin archivo seleccionado";
    return;
  }
  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  image.alt = "Vista previa del comprobante";
  const label = document.createElement("span");
  label.className = "file-preview__label";
  label.textContent = file.name;
  receiptPreview.append(image, label);
}

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

    // 1) Resolver email: si escribe correo, úsalo; si escribe username, buscar en /usernames/{usernameLower}
    let email = inputUser;
    if (!inputUser.includes("@")) {
      if (!window.__fb?.db || !window.__fb?.doc || !window.__fb?.getDoc) {
        setStatusMessage(loginMessage, "Firestore no está inicializado.", "error");
        return;
      }
      const usernameKey = inputUser.toLowerCase();
      const ref = window.__fb.doc(window.__fb.db, "usernames", usernameKey);
      const snap = await window.__fb.getDoc(ref);
      if (!snap.exists() || !snap.data()?.email) {
        setStatusMessage(loginMessage, "Usuario no encontrado.", "error");
        return;
      }
      email = snap.data().email;
    }

    // 2) Login Auth
    const cred = await window.__fb.signInWithEmailAndPassword(window.__fb.auth, email, password);

    // 3) Leer perfil desde /users/{uid} (Opción B). Si no existe, lo creamos como empleado.
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

    // 4) Guardar sesión en state
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

    // 5) Cargar lista de usuarios solo si corresponde (tu UI ya controla el menú)
    await syncUsersFromFirestore();

    updateView();
  } catch (e) {
    console.error(e);
    setStatusMessage(loginMessage, "Credenciales inválidas.", "error");
  }
});


logoutButton.addEventListener("click", async () => {
  try {
    if (window.__fb?.auth && window.__fb?.signOut) {
      await window.__fb.signOut(window.__fb.auth);
    }
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
    if (!window.__fb?.auth || !window.__fb?.sendPasswordResetEmail) {
      setStatusMessage(loginMessage, "Firebase no está inicializado.", "error");
      return;
    }

    let email = inputUser;
    if (!email.includes("@")) {
      const usernameKey = inputUser.toLowerCase();
      const { db, doc, getDoc } = window.__fb;
      let snap;
      try {
        snap = await getDoc(doc(db, "usernames", usernameKey));
      } catch (err) {
        console.error(err);
        setStatusMessage(loginMessage, "No se pudo validar el usuario (Firestore).", "error");
        return;
      }
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


function closeMenu() {
  sidebar.classList.remove("is-open");
  pageEl?.classList.remove("is-menu-open");
}

menuToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
  pageEl?.classList.toggle("is-menu-open");
});

pageEl?.addEventListener("click", (e) => {
  if (pageEl.classList.contains("is-menu-open")) {
    const isClickInsideSidebar = sidebar.contains(e.target);
    const isClickOnToggle = menuToggle && menuToggle.contains(e.target);
    if (!isClickInsideSidebar && !isClickOnToggle) {
      closeMenu();
    }
  }
});

window.addEventListener("resize", () => {
  updateDeviceClass();
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("hidden")) {
      return;
    }
    setActiveView(button.dataset.view);
    closeMenu();
  });
});

exportButton?.addEventListener("click", () => {
  if (!state.currentUser) {
    setStatusMessage(sheetStatusEl, "Inicia sesión para exportar.", "error");
    return;
  }
  if (!canExport()) {
    setStatusMessage(sheetStatusEl, "Solo un administrador puede exportar reportes.", "error");
    return;
  }
  const header = [
    "Fecha",
    "Cliente",
    "Proyecto",
    "Ciudad",
    "Categoría",
    "Soporte",
    "Descripción",
    "Observaciones",
    "Valor",
    "ComprobanteNombre",
    "ComprobanteUrl",
  ];
  const rows = [header];
  state.expenses.forEach((e) => {
    rows.push([
      e.date,
      e.clientName,
      e.projectName,
      e.city,
      e.category,
      e.supportType,
      e.description,
      e.notes,
      e.amount,
      e.receiptName,
      e.receiptUrl,
    ]);
  });
  const stamp = new Date().toISOString().slice(0,10);
  downloadCsv(`egresos-${stamp}.csv`, rows);
  setStatusMessage(sheetStatusEl, "Exportación descargada (CSV para Excel).", "success");
});

syncButton.addEventListener("click", () => {
  persistState();
  if (!isSyncEnabled()) {
    setStatusMessage(sheetStatusEl, "Datos guardados localmente.", "success");
    return;
  }
  syncFromSheets();
});

expenseClient.addEventListener("change", () => {
  renderOptions();
});

expenseProject.addEventListener("change", () => {
  renderOptions();
});

projectList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }
  if (!target.classList.contains("status-select")) {
    return;
  }
  if (!canManageProjects()) {
    return;
  }
  const projectId = target.dataset.project;
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) {
    return;
  }
  project.status = target.value;
  persistState();
  renderProjects();
  renderBalances();
  updateExpenseAvailability();
});

projectClient.addEventListener("change", () => {
  updateProjectCodeSuggestion();
});

projectCityInput.addEventListener("input", () => {
  updateProjectCodeSuggestion();
});

projectCodeInput.addEventListener("input", () => {
  markProjectCodeManual();
});

receiptInput.addEventListener("change", (event) => {
  handleReceiptPreview(event.target.files[0]);
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const projectId = expenseProject.value;
  const project = state.projects.find((item) => item.id === projectId);
  const remaining = calculateProjectBalance(projectId);
  if (project && !isProjectVisibleToUser(project)) {
    setStatusMessage(expenseMessage, "No tienes permiso para registrar gastos en este proyecto.", "error");
    return;
  }
  if (remaining <= 0) {
    setStatusMessage(expenseMessage, "La caja está en $0. No se puede registrar el egreso.", "error");
    return;
  }
  if ((project?.status || "activo") === "inactivo") {
    setStatusMessage(expenseMessage, "El proyecto está inactivo. No se puede registrar el egreso.", "error");
    return;
  }

  const receiptFile = receiptInput.files[0];
  if (!receiptFile) {
    setStatusMessage(expenseMessage, "Debe adjuntar una foto del comprobante.", "error");
    return;
  }

  const client = state.clients.find((item) => item.id === expenseClient.value);
  const amount = Number(document.getElementById("expense-amount").value);

  if (amount > remaining) {
    setStatusMessage(expenseMessage, "El valor supera el saldo disponible en la caja.", "error");
    return;
  }

  let receiptUrl = "";
  if (isSyncEnabled()) {
    try {
      const encoded = await readFileAsDataUrl(receiptFile);
      const base64 = encoded.split(",")[1] ?? "";
      const upload = await apiRequest("uploadReceipt", {
        fileName: receiptFile.name,
        mimeType: receiptFile.type,
        base64,
      });
      receiptUrl = upload?.url || "";
    } catch (error) {
      console.error("No fue posible subir el comprobante", error);
      setStatusMessage(expenseMessage, "No fue posible subir el comprobante a Drive.", "error");
      return;
    }
  }

  const newExpense = {
    id: `exp_${crypto.randomUUID()}`,
    date: document.getElementById("expense-date").value,
    category: expenseCategory.value,
    supportType: expenseSupport.value,
    description: document.getElementById("expense-description").value.trim(),
    notes: expenseNotes.value.trim(),
    amount,
    receiptName: receiptFile.name,
    receiptUrl,
    clientId: client?.id,
    clientName: client?.name ?? "",
    projectId: project?.id,
    projectName: project?.name ?? "",
    city: expenseCity.value || project?.city || "",
    createdAt: new Date().toISOString(),
  };

  state.expenses.push(newExpense);
  persistState();
  setStatusMessage(expenseMessage, "Egreso registrado correctamente.", "success");
  expenseForm.reset();
  expenseCategory.value = "";
  expenseSupport.value = "";
  expenseNotes.value = "";
  handleReceiptPreview(null);
  renderExpenses();
  renderRecentExpenses();
  renderBalances();
  renderStats();
  updateExpenseAvailability();

  if (isSyncEnabled()) {
    try {
      await apiRequest("appendExpense", {
        id: newExpense.id,
        fecha: newExpense.date,
        categoría: newExpense.category,
        "tipo soporte": newExpense.supportType,
        descripción: newExpense.description,
        observaciones: newExpense.notes,
        valor: newExpense.amount,
        clienteId: newExpense.clientId,
        cliente: newExpense.clientName,
        proyectoId: newExpense.projectId,
        proyecto: newExpense.projectName,
        ciudad: newExpense.city,
        comprobanteNombre: newExpense.receiptName,
        comprobanteUrl: newExpense.receiptUrl,
      });
    } catch (error) {
      console.error("No fue posible sincronizar el egreso", error);
      setStatusMessage(
        expenseMessage,
        "Egreso guardado localmente, pero no se pudo sincronizar con Google Sheets.",
        "error",
      );
    }
  }
});

clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canManageProjects()) {
    setStatusMessage(clientMessage, "No tienes permisos para crear clientes.", "error");
    return;
  }
  const name = document.getElementById("client-name").value.trim();
  const city = document.getElementById("client-city").value.trim();
  const contact = document.getElementById("client-contact").value.trim();

  if (!name || !city) {
    setStatusMessage(clientMessage, "Complete todos los campos obligatorios.", "error");
    return;
  }

  const clientCode = normalizeCodeSegment(name);
  const clientId = `client_${crypto.randomUUID()}`;
  state.clients.push({
    id: clientId,
    code: clientCode,
    name,
    city,
    contact,
  });
  persistState();
  setStatusMessage(clientMessage, "Cliente creado.", "success");
  clientForm.reset();
  renderClients();
  renderOptions();
  renderStats();

  if (isSyncEnabled()) {
    try {
      await apiRequest("appendClient", {
        id: clientId,
        code: clientCode,
        name,
        city,
        contact,
      });
    } catch (error) {
      console.error("No fue posible sincronizar el cliente", error);
      setStatusMessage(
        clientMessage,
        "Cliente guardado localmente, pero no se pudo sincronizar con Google Sheets.",
        "error",
      );
    }
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canManageProjects()) {
    setStatusMessage(projectMessage, "No tienes permisos para crear proyectos.", "error");
    return;
  }
  const clientId = projectClient.value;
  const client = state.clients.find((item) => item.id === clientId);
  const code = projectCodeInput.value.trim() || getSuggestedProjectCode();
  const name = document.getElementById("project-name").value.trim();
  const city = document.getElementById("project-city").value.trim();
  const responsibleId = projectResponsible.value;
  const responsible = state.users.find((user) => user.id === responsibleId);
  const baseAmount = Number(document.getElementById("project-base").value);
  const notes = projectNotes.value.trim();

  if (!client) {
    setStatusMessage(projectMessage, "Seleccione un cliente válido.", "error");
    return;
  }

  if (!code || !name || !city || !baseAmount || !responsible) {
    setStatusMessage(projectMessage, "Complete todos los campos del proyecto.", "error");
    return;
  }

  const projectId = `project_${crypto.randomUUID()}`;
  state.projects.push({
    id: projectId,
    clientId: client.id,
    clientName: client.name,
    code,
    name,
    city,
    baseAmount,
    responsibleId: responsible.id,
    responsibleName: responsible.name,
    responsibleUsername: responsible.username,
    responsibleEmail: responsible.email || "",
    notes,
    status: "activo",
  });
  persistState();
  setStatusMessage(projectMessage, "Proyecto creado.", "success");
  projectForm.reset();
  projectCodeInput.dataset.auto = "true";
  renderOptions();
  renderProjects();
  renderBalances();
  renderStats();

  if (isSyncEnabled()) {
    try {
      await apiRequest("appendProject", {
        id: projectId,
        clientId: client.id,
        clientName: client.name,
        code,
        name,
        city,
        baseAmount,
        responsibleId: responsible.id,
        responsibleName: responsible.name,
        responsibleUsername: responsible.username,
        responsibleEmail: responsible.email || "",
        notes,
        status: "activo",
      });
    } catch (error) {
      console.error("No fue posible sincronizar el proyecto", error);
      setStatusMessage(
        projectMessage,
        "Proyecto guardado localmente, pero no se pudo sincronizar con Google Sheets.",
        "error",
      );
    }
  }
});

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
  const role = "empleado"; // o toma el valor del select si lo tienes

  if (!email) {
    setStatusMessage(userMessage, "El correo es obligatorio para crear el usuario.", "error");
    return;
  }
  if (!username) {
    setStatusMessage(userMessage, "El username es obligatorio.", "error");
    return;
  }
  if (!password || password.length < 6) {
    setStatusMessage(userMessage, "La contraseña debe tener al menos 6 caracteres.", "error");
    return;
  }

  const usernameKey = username.toLowerCase();

  // Validación local (si ya cargaste usuarios)
  if (state.users.some((u) => (u.username || "").toLowerCase() === usernameKey)) {
    setStatusMessage(userMessage, "El usuario ya existe.", "error");
    return;
  }

  try {
    setStatusMessage(userMessage, "Creando usuario...", "loading");
    await refreshFirebaseToken(true);

    const { db, doc, getDoc, setDoc, adminAuth, createUserWithEmailAndPassword } = window.__fb;

    if (!adminAuth) {
      setStatusMessage(
        userMessage,
        "adminAuth no está inicializado. Revisa el script module en index.html.",
        "error"
      );
      return;
    }

    // 1) Verificar que username no esté tomado en /usernames
    const usernameRef = doc(db, "usernames", usernameKey);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      setStatusMessage(userMessage, "Ese username ya está tomado.", "error");
      return;
    }

    // 2) Crear usuario en Auth usando Auth secundario (no cambia sesión del admin)
    const newCred = await createUserWithEmailAndPassword(adminAuth, email, password);
    const newUid = newCred.user.uid;

    // 3) Guardar perfil en /users/{uid} (sin password)
    const newUserProfile = {
      name: name || username,
      email,
      username,
      role,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "users", newUid), newUserProfile);

    // 4) Guardar username -> email en /usernames/{usernameLower}
    await setDoc(usernameRef, { email });

    // 5) Refrescar listado de usuarios
    await syncUsersFromFirestore();
    renderUsers();

    setStatusMessage(userMessage, "Usuario creado (Auth + Firestore).", "success");
    userForm.reset();
  } catch (error) {
    console.error(error);
    setStatusMessage(userMessage, "No se pudo crear el usuario.", "error");
  }
});

conceptForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin()) {
    setStatusMessage(conceptMessage, "Solo un administrador puede agregar conceptos.", "error");
    return;
  }
  const concept = conceptNameInput.value.trim();
  if (!concept) {
    setStatusMessage(conceptMessage, "Escribe un concepto válido.", "error");
    return;
  }
  if (state.concepts.some((item) => item.toLowerCase() === concept.toLowerCase())) {
    setStatusMessage(conceptMessage, "El concepto ya existe.", "error");
    return;
  }
  state.concepts.push(concept);
  persistState();
  setStatusMessage(conceptMessage, "Concepto agregado.", "success");
  conceptForm.reset();
  renderOptions();
});


function attachAuthListener() {
  if (!window.__fb?.onAuthStateChanged || !window.__fb?.auth) {
    return;
  }

  window.__fb.onAuthStateChanged(window.__fb.auth, (user) => {
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

    const userEmail = user.email || "usuario";
    const matchedUser = getUserMatch(userEmail, "");
    const role =
      matchedUser?.role ||
      (ADMIN_EMAILS.includes(userEmail)
        ? "admin"
        : LEADER_EMAILS.includes(userEmail)
          ? "lider"
          : "empleado");

    state.currentUser = {
      id: user.uid,
      name: matchedUser?.name || userEmail,
      username: userEmail,
      email: userEmail,
      role,
    };

    persistState();
    persistSession(state.currentUser);
    scheduleSessionExpiry(Date.now() + SESSION_TIMEOUT_MS);
    syncUsersFromFirestore().finally(() => {
      updateView();
    });
  });
}

function initApp() {
  if (driveFolderEl) {
    const folderLink = document.createElement("a");
    folderLink.href = folderUrl;
    folderLink.textContent = CONFIG.driveFolderId;
    folderLink.target = "_blank";
    folderLink.rel = "noreferrer";
    folderLink.className = "link";
    driveFolderEl.append(folderLink);
  }

  if (projectCodeInput) {
    projectCodeInput.dataset.auto = "true";
  }

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
  syncFromSheets();
}

initApp();
