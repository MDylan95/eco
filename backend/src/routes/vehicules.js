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
  const normalizedImmatriculation = String(immatriculation || "").trim().toUpperCase();
  const normalizedType = String(type || "").trim();

  if (!normalizedImmatriculation) return res.status(400).json({ error: "Immatriculation requise" });
  try {
    const r = await db.query(
      `INSERT INTO vehicules (immatriculation, type) VALUES ($1, $2) RETURNING *`,
      [normalizedImmatriculation, normalizedType || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Immatriculation déjà existante" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/vehicules/:id
router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  const { immatriculation, type, actif } = req.body;
  const normalizedImmatriculation = String(immatriculation || "").trim().toUpperCase();
  const normalizedType = String(type || "").trim();
  const normalizedActif = actif === false ? false : true;

  if (!normalizedImmatriculation) {
    return res.status(400).json({ error: "Immatriculation requise" });
  }

  try {
    const r = await db.query(
      `UPDATE vehicules
         SET immatriculation=$1, type=$2, actif=$3
       WHERE id=$4
       RETURNING *`,
      [normalizedImmatriculation, normalizedType || null, normalizedActif, req.params.id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Véhicule introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Immatriculation déjà existante" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/vehicules/:id (désactivation)
router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE vehicules
         SET actif = FALSE
       WHERE id=$1
       RETURNING *`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Véhicule introuvable" });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
