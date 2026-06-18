require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../db");

function isProductionDbInitAllowed() {
  const raw = String(process.env.FORCE_DB_INIT || "").toLowerCase();
  return ["1", "true", "yes", "on", "y"].includes(raw);
}

(async () => {
  if (process.env.NODE_ENV === "production" && !isProductionDbInitAllowed()) {
    throw new Error(
      "Refus d'exécuter db:init en production : définissez FORCE_DB_INIT=true si c'est bien intentionnel."
    );
  }

  try {
    const sql = fs.readFileSync(path.join(__dirname, "../../sql/01_schema.sql"), "utf8");
    await db.query(sql);
    console.log("✅ Schéma créé avec succès");
    process.exit(0);
  } catch (e) {
    console.error("❌ Erreur création schéma :", e.message);
    process.exit(1);
  }
})();
