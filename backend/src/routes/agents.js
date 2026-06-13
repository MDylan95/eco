const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/agents?fonction=chauffeur|eboueur
router.get("/", authRequired, async (req, res) => {
  const { fonction } = req.query;
  try {
    const params = [];
    let sql =
      "SELECT id, matricule, nom, prenom, fonction, actif FROM agents WHERE actif = TRUE";
    if (fonction) {
      params.push(fonction);
      sql += ` AND fonction = $${params.length}`;
    }
    sql += " ORDER BY nom, prenom";
    const r = await db.query(sql, params);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/agents
router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  const { matricule, nom, prenom, fonction } = req.body;
  if (!matricule || !nom || !prenom || !["chauffeur", "eboueur"].includes(fonction)) {
    return res.status(400).json({ error: "Champs invalides" });
  }
  try {
    const r = await db.query(
      `INSERT INTO agents (matricule, nom, prenom, fonction)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [matricule, nom, prenom, fonction]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Matricule déjà existant" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/agents/:id
router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  const { nom, prenom, fonction, actif } = req.body;
  try {
    const r = await db.query(
      `UPDATE agents SET nom=$1, prenom=$2, fonction=$3, actif=$4
       WHERE id=$5 RETURNING *`,
      [nom, prenom, fonction, actif, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Agent introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
