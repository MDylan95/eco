const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const r = await db.query(
      "SELECT id, immatriculation, type, actif FROM vehicules WHERE actif = TRUE ORDER BY immatriculation"
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  const { immatriculation, type } = req.body;
  if (!immatriculation) return res.status(400).json({ error: "Immatriculation requise" });
  try {
    const r = await db.query(
      `INSERT INTO vehicules (immatriculation, type) VALUES ($1, $2) RETURNING *`,
      [immatriculation, type || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Immatriculation déjà existante" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
