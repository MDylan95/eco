const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard?date=YYYY-MM-DD
router.get("/", authRequired, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    // KPIs du jour
    const kpisQ = await db.query(
      `
      SELECT
        COUNT(p.id)::int                        AS equipages_planifies,
        COUNT(pr.id)::int                       AS equipages_clotures,
        COALESCE(SUM(pr.tonnage), 0)::numeric   AS tonnage_total
      FROM planifications p
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification = $1
    `,
      [date]
    );

    // Tonnage par commune
    const parCommuneQ = await db.query(
      `
      SELECT co.nom AS commune,
             COUNT(DISTINCT ci.id)::int             AS nb_circuits,
             COALESCE(SUM(pr.tonnage), 0)::numeric  AS tonnage
      FROM planifications p
      JOIN circuits ci ON ci.id = p.circuit_id
      JOIN communes co ON co.id = ci.commune_id
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification = $1
      GROUP BY co.nom
      ORDER BY tonnage DESC
    `,
      [date]
    );

    // Tonnage par circuit (pour bar chart)
    const parCircuitQ = await db.query(
      `
      SELECT ci.code AS circuit, co.nom AS commune,
             COALESCE(pr.tonnage, 0)::numeric AS tonnage,
             CASE WHEN pr.id IS NULL THEN 'pending' ELSE 'done' END AS statut
      FROM planifications p
      JOIN circuits ci ON ci.id = p.circuit_id
      JOIN communes co ON co.id = ci.commune_id
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification = $1
      ORDER BY ci.code
    `,
      [date]
    );

    // Évolution sur 7 jours
    const trendQ = await db.query(
      `
      SELECT to_char(p.date_planification, 'YYYY-MM-DD') AS jour,
             COALESCE(SUM(pr.tonnage), 0)::numeric AS tonnage
      FROM planifications p
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification BETWEEN ($1::date - INTERVAL '6 days') AND $1::date
      GROUP BY p.date_planification
      ORDER BY p.date_planification
    `,
      [date]
    );

    res.json({
      date,
      kpis: kpisQ.rows[0],
      par_commune: parCommuneQ.rows,
      par_circuit: parCircuitQ.rows,
      tendance_7j: trendQ.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
