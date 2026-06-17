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
  const normalizedMatricule = String(matricule || "").trim().toUpperCase();
  const normalizedNom = String(nom || "").trim().toUpperCase();
  const normalizedPrenom = String(prenom || "").trim();

  if (!normalizedMatricule || !normalizedNom || !["chauffeur", "eboueur"].includes(fonction)) {
    return res.status(400).json({ error: "Champs invalides" });
  }
  try {
    const r = await db.query(
      `INSERT INTO agents (matricule, nom, prenom, fonction)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [normalizedMatricule, normalizedNom, normalizedPrenom, fonction]
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
  const { matricule, nom, prenom, fonction, actif } = req.body;
  const normalizedMatricule = String(matricule || "").trim().toUpperCase();
  const normalizedNom = String(nom || "").trim().toUpperCase();
  const normalizedPrenom = String(prenom || "").trim();
  const normalizedActif = actif === false ? false : true;

  if (!normalizedMatricule || !normalizedNom || !["chauffeur", "eboueur"].includes(fonction)) {
    return res.status(400).json({ error: "Champs invalides" });
  }
  try {
    const r = await db.query(
      `UPDATE agents SET matricule=$1, nom=$2, prenom=$3, fonction=$4, actif=$5
       WHERE id=$6 RETURNING *`,
      [normalizedMatricule, normalizedNom, normalizedPrenom, fonction, normalizedActif, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Agent introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Matricule déjà existant" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/agents/:id (désactivation)
router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE agents
         SET actif = FALSE
       WHERE id=$1
       RETURNING *`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Agent introuvable" });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
