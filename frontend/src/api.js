// En développement local : "/api" (passe par le proxy Vite vers localhost:4000)
// En production : URL complète du backend, fournie via VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

function getToken() {
  return localStorage.getItem("eco_token");
}

export function setSession(token, user) {
  localStorage.setItem("eco_token", token);
  localStorage.setItem("eco_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("eco_token");
  localStorage.removeItem("eco_user");
}

export function getUser() {
  const u = localStorage.getItem("eco_user");
  return u ? JSON.parse(u) : null;
}

async function request(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...opts, headers });

  if (res.status === 401) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expirée");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  // Référentiel
  communes: () => request("/communes"),
  circuits: (commune_id) =>
    request("/circuits" + (commune_id ? `?commune_id=${commune_id}` : "")),
  agents: (fonction) =>
    request("/agents" + (fonction ? `?fonction=${fonction}` : "")),
  vehicules: () => request("/vehicules"),

  // Planifications
  planifications: (date) => request(`/planifications?date=${date}`),
  createPlanification: (data) =>
    request("/planifications", { method: "POST", body: JSON.stringify(data) }),
  deletePlanification: (id) =>
    request(`/planifications/${id}`, { method: "DELETE" }),

  // Productions
  saveProduction: (planification_id, tonnage) =>
    request("/productions", {
      method: "POST",
      body: JSON.stringify({ planification_id, tonnage }),
    }),

  // Dashboard
  dashboard: (date) => request(`/dashboard?date=${date}`),
};
