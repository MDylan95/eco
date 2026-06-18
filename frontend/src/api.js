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

  let res;
  try {
    res = await fetch(API_BASE + path, { ...opts, headers });
  } catch (error) {
    throw new Error("Impossible de joindre le serveur. Vérifiez le déploiement backend et le CORS.");
  }

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
  createCommune: (nom) =>
    request("/communes", {
      method: "POST",
      body: JSON.stringify({ nom }),
    }),
  updateCommune: (id, nom) =>
    request(`/communes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nom }),
    }),
  deleteCommune: (id) =>
    request(`/communes/${id}`, {
      method: "DELETE",
    }),
  circuits: (commune_id) =>
    request("/circuits" + (commune_id ? `?commune_id=${commune_id}` : "")),
  createCircuit: ({ code, commune_id }) =>
    request("/circuits", {
      method: "POST",
      body: JSON.stringify({ code, commune_id }),
    }),
  updateCircuit: (id, { code, commune_id, actif }) =>
    request(`/circuits/${id}`, {
      method: "PUT",
      body: JSON.stringify({ code, commune_id, actif }),
    }),
  deleteCircuit: (id) =>
    request(`/circuits/${id}`, {
      method: "DELETE",
    }),
  agents: (fonction) =>
    request("/agents" + (fonction ? `?fonction=${fonction}` : "")),
  createAgent: ({ matricule, nom, prenom, fonction }) =>
    request("/agents", {
      method: "POST",
      body: JSON.stringify({ matricule, nom, prenom, fonction }),
    }),
  updateAgent: (id, { matricule, nom, prenom, fonction, actif }) =>
    request(`/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify({ matricule, nom, prenom, fonction, actif }),
    }),
  deleteAgent: (id) =>
    request(`/agents/${id}`, {
      method: "DELETE",
    }),
  vehicules: () => request("/vehicules"),
  createVehicule: ({ immatriculation, type }) =>
    request("/vehicules", {
      method: "POST",
      body: JSON.stringify({ immatriculation, type }),
    }),
  updateVehicule: (id, { immatriculation, type, actif }) =>
    request(`/vehicules/${id}`, {
      method: "PUT",
      body: JSON.stringify({ immatriculation, type, actif }),
    }),
  deleteVehicule: (id) =>
    request(`/vehicules/${id}`, {
      method: "DELETE",
    }),

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
  dashboard: (date, options = {}) => {
    const params = new URLSearchParams({ date });
    if (options.week_date) params.set("week_date", options.week_date);
    if (options.compare_week_date) params.set("compare_week_date", options.compare_week_date);
    return request(`/dashboard?${params}`);
  },
};
