const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

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

module.exports = router;
