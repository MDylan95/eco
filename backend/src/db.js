const { Pool } = require("pg");

function normalizeDatabaseUrl(rawUrl = "") {
  if (!rawUrl) return rawUrl;

  try {
    const normalized = new URL(rawUrl);
    const needsMode = normalized.searchParams.get("sslmode");
    if (["prefer", "require", "verify-ca"].includes(needsMode)) {
      normalized.searchParams.set("sslmode", "verify-full");
    }
    return normalized.toString();
  } catch {
    return rawUrl;
  }
}

function isLocalHost(rawUrl = "") {
  try {
    const { hostname } = new URL(rawUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

// Neon et la plupart des hébergeurs cloud exigent SSL
// En local (Docker), SSL n'est pas nécessaire
const needsSSL = Boolean(databaseUrl && !isLocalHost(databaseUrl));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Erreur pool PostgreSQL :", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
