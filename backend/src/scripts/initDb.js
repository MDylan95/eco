require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../db");

(async () => {
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
