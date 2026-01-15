import { auth, db, fb } from "./firebase.js";

export function qs(sel){return document.querySelector(sel);}
export function qsa(sel){return Array.from(document.querySelectorAll(sel));}

export function setNotice(el, message, variant){
  if(!el) return;
  el.textContent = message || "";
  el.classList.remove("is-error","is-success","is-loading");
  if(variant) el.classList.add(`is-${variant}`);
}

export async function usernameToEmail(input){
  const value = (input || "").trim().toLowerCase();

  // Si ya es correo, regresa igual
  if(value.includes("@")) return value;

  // Buscar en users por username
  const q = fb.query(
    fb.collection(db, "users"),
    fb.where("username", "==", value),
    fb.limit(1)
  );

  const snap = await fb.getDocs(q);
  if (snap.empty) return null;

  const data = snap.docs[0].data();
  return data?.email || null;
}


export function requireAuth(options = {}) {
  const { allowedRoles = null } = options;

  return new Promise((resolve) => {
    fb.onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "./login.html";
        return;
      }

      // Leer perfil (users/{uid})
      const ref = fb.doc(db, "users", user.uid);
      const profileSnap = await fb.getDoc(ref);
      const profile = profileSnap.exists()
        ? profileSnap.data()
        : { role: "empleado", name: user.email, email: user.email };

      const role = profile.role || "empleado";

      if (allowedRoles && !allowedRoles.includes(role)) {
        window.location.href = "./dashboard.html";
        return;
      }

      // LOGICA DEL MENU MOVIL
      const toggleBtn = document.getElementById("menu-toggle");
      const sidebar = document.querySelector(".sidebar");
      if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
          sidebar.classList.toggle("is-open");
        });

        // Cerrar menú al hacer click fuera (opcional)
        document.addEventListener("click", (e) => {
          if (
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target) &&
            sidebar.classList.contains("is-open")
          ) {
            sidebar.classList.remove("is-open");
          }
        });
      }

      resolve({ user, profile, role });
    });
  });
}

export function setActiveNav(){
  const path = window.location.pathname.split("/").pop();
  qsa(".nav a").forEach(a =>
    a.classList.toggle("is-active", a.getAttribute("href").endsWith(path))
  );
}

export function fillUserBadge(profile){
  const badge = qs("#user-badge");
  if(badge) badge.textContent = `${profile.name || "Usuario"} · ${profile.role || "empleado"}`;
}

export async function logout(){
  await fb.signOut(auth);
  window.location.href = "./login.html";
}

// Helpers ids
export function uid(){
  return auth.currentUser?.uid || null;
}
