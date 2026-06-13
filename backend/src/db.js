const { Pool } = require("pg");

// Neon et la plupart des hébergeurs cloud exigent SSL
// En local (Docker), SSL n'est pas nécessaire
const needsSSL =
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes("localhost") &&
  !process.env.DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Erreur pool PostgreSQL :", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
