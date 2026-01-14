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
  // Si ya es correo, regresa igual
  if(input.includes("@")) return input;
  const key = input.trim().toLowerCase();
  const snap = await fb.getDoc(fb.doc(db,"usernames",key));
  if(!snap.exists() || !snap.data()?.email) return null;
  return snap.data().email;
}

export function requireAuth(options={}){
  const { allowedRoles=null } = options;
  return new Promise((resolve) => {
    fb.onAuthStateChanged(auth, async (user) => {
      if(!user){
        window.location.href = "./login.html";
        return;
      }

      // Leer perfil (users/{uid})
      const ref = fb.doc(db,"users",user.uid);
      const profileSnap = await fb.getDoc(ref);
      const profile = profileSnap.exists()
        ? profileSnap.data()
        : { role:"empleado", name:user.email, email:user.email };

      const role = profile.role || "empleado";

      if(allowedRoles && !allowedRoles.includes(role)){
        window.location.href = "./dashboard.html";
        return;
      }

      // === BOTÓN ADMIN (solo visible para tu correo) ===
      let btnBootstrap = document.getElementById("btnBootstrapAdmin");

      if (!btnBootstrap) {
        btnBootstrap = document.createElement("button");
        btnBootstrap.id = "btnBootstrapAdmin";
        btnBootstrap.textContent = "Convertirme en Admin";

        btnBootstrap.style.marginLeft = "12px";
        btnBootstrap.style.padding = "6px 12px";
        btnBootstrap.style.borderRadius = "8px";
        btnBootstrap.style.border = "none";
        btnBootstrap.style.cursor = "pointer";
        btnBootstrap.style.background = "#2563eb";
        btnBootstrap.style.color = "#fff";

        const header = document.querySelector("header") || document.body;
        header.appendChild(btnBootstrap);
      }

      // Mostrar solo al correo permitido
      const email = (user.email || "").toLowerCase();
      btnBootstrap.style.display =
        email === "info@msauditores.co" ? "inline-block" : "none";

      // ✅ Un solo onclick (y no promete algo que no hace)
      btnBootstrap.onclick = async () => {
        alert(
          "Este botón está desactivado porque NO estamos usando Functions.\n\n" +
          "Para ser ADMIN debes crear/editar tu rol en Firestore:\n" +
          "users/{TU_UID} -> role: 'admin'"
        );
      };

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
