const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

function normalizeText(value) {
  return String(value || "").trim();
}

// GET /api/communes  ·  liste des communes avec leurs circuits
router.get("/communes", authRequired, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT c.id, c.nom,
        COALESCE(json_agg(json_build_object('id', ci.id, 'code', ci.code))
                 FILTER (WHERE ci.id IS NOT NULL), '[]') AS circuits
      FROM communes c
      LEFT JOIN circuits ci ON ci.commune_id = c.id AND ci.actif = TRUE
      GROUP BY c.id, c.nom
      ORDER BY c.nom
    `);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/communes
router.post("/communes", authRequired, requireRole("admin"), async (req, res) => {
  const nom = normalizeText(req.body?.nom).toUpperCase();
  if (!nom) return res.status(400).json({ error: "Nom requis" });

  try {
    const r = await db.query(
      "INSERT INTO communes (nom) VALUES ($1) RETURNING *",
      [nom]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Commune déjà existante" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/communes/:id
router.put("/communes/:id", authRequired, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const nom = normalizeText(req.body?.nom).toUpperCase();
  if (!Number.isInteger(id) || id <= 0 || !nom) {
    return res.status(400).json({ error: "Nom invalide" });
  }

  try {
    const r = await db.query(
      "UPDATE communes SET nom = $1 WHERE id = $2 RETURNING *",
      [nom, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Commune introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Nom déjà utilisé" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/communes/:id
router.delete("/communes/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const usedByCircuit = await db.query(
      "SELECT 1 FROM circuits WHERE commune_id = $1 LIMIT 1",
      [id]
    );
    if (usedByCircuit.rowCount > 0) {
      return res.status(409).json({
        error: "Suppression impossible : cette commune contient des circuits existants",
      });
    }

    const r = await db.query(
      "DELETE FROM communes WHERE id = $1 RETURNING *",
      [id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Commune introuvable" });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/circuits?commune_id=
router.get("/circuits", authRequired, async (req, res) => {
  const { commune_id } = req.query;
  try {
    const params = [];
    let sql = `
      SELECT ci.id, ci.code, ci.commune_id, c.nom AS commune
      FROM circuits ci JOIN communes c ON c.id = ci.commune_id
      WHERE ci.actif = TRUE
    `;
    if (commune_id) {
      params.push(commune_id);
      sql += ` AND ci.commune_id = $${params.length}`;
    }
    sql += " ORDER BY ci.code";
    const r = await db.query(sql, params);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/circuits
router.post("/circuits", authRequired, requireRole("admin"), async (req, res) => {
  const code = normalizeText(req.body?.code).toUpperCase();
  const commune_id = Number(req.body?.commune_id);
  if (!code || !Number.isInteger(commune_id) || commune_id <= 0) {
    return res.status(400).json({ error: "Code et commune sont requis" });
  }

  try {
    const r = await db.query(
      "INSERT INTO circuits (code, commune_id) VALUES ($1, $2) RETURNING *",
      [code, commune_id]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Circuit déjà existant" });
    if (e.code === "23503") return res.status(400).json({ error: "Commune introuvable" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/circuits/:id
router.put("/circuits/:id", authRequired, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const code = normalizeText(req.body?.code).toUpperCase();
  const actif = req.body?.actif === false ? false : true;
  const commune_id = Number(req.body?.commune_id);

  if (!Number.isInteger(id) || id <= 0 || !code) {
    return res.status(400).json({ error: "Code requis" });
  }
  if (!Number.isInteger(commune_id) || commune_id <= 0) {
    return res.status(400).json({ error: "Commune invalide" });
  }

  try {
    const r = await db.query(
      "UPDATE circuits SET code = $1, commune_id = $2, actif = $3 WHERE id = $4 RETURNING *",
      [code, commune_id, actif, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Circuit introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Code déjà utilisé" });
    if (e.code === "23503") return res.status(400).json({ error: "Commune introuvable" });
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/circuits/:id (désactivation)
router.delete("/circuits/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const r = await db.query(
      "UPDATE circuits SET actif = FALSE WHERE id = $1 RETURNING *",
      [id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Circuit introuvable" });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
