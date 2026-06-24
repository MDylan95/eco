const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

function normalizeDate(value) {
  const date = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

// GET /api/dashboard?date=YYYY-MM-DD
router.get("/", authRequired, async (req, res) => {
  const date = req.query.date ? normalizeDate(req.query.date) : new Date().toISOString().slice(0, 10);
  const weekDate = req.query.week_date ? normalizeDate(req.query.week_date) : date;
  const compareWeekDate = req.query.compare_week_date ? normalizeDate(req.query.compare_week_date) : null;

  if (req.query.date && !date) {
    return res.status(400).json({ error: "Format de date invalide (YYYY-MM-DD attendu)" });
  }
  if (req.query.week_date && !weekDate) {
    return res.status(400).json({ error: "week_date invalide (YYYY-MM-DD attendu)" });
  }
  if (req.query.compare_week_date && !compareWeekDate) {
    return res.status(400).json({ error: "compare_week_date invalide (YYYY-MM-DD attendu)" });
  }

  const usePreviousWeek = !compareWeekDate;
  const compareReferenceDate = compareWeekDate || weekDate;
  const compareStartExpr = usePreviousWeek
    ? "date_trunc('week', $1::date) - INTERVAL '7 days'"
    : "date_trunc('week', $1::date)";

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

    const semaineQ = await db.query(
      `
      SELECT
        to_char(date_trunc('week', $1::date), 'YYYY-MM-DD') AS debut,
        to_char(date_trunc('week', $1::date) + INTERVAL '6 days', 'YYYY-MM-DD') AS fin
      `,
      [weekDate]
    );

    const semaineCompareQ = await db.query(
      `
      SELECT
        to_char(${compareStartExpr}, 'YYYY-MM-DD') AS debut,
        to_char((${compareStartExpr}) + INTERVAL '6 days', 'YYYY-MM-DD') AS fin
      `,
      [compareReferenceDate]
    );

    const chauffeurHebdoQ = await db.query(
      `
      WITH semaine AS (
        SELECT date_trunc('week', $1::date) AS debut
      )
      SELECT
        a.id AS chauffeur_id,
        a.matricule,
        a.nom,
        a.prenom,
        COALESCE(SUM(COALESCE(pr.voyages, 0)), 0)::int AS voyages,
        COALESCE(SUM(pr.tonnage), 0)::numeric AS tonnage_hebdo
      FROM planifications p
      JOIN semaine s ON TRUE
      JOIN agents a ON a.id = p.chauffeur_id
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification >= s.debut
        AND p.date_planification < (s.debut + INTERVAL '7 days')
      GROUP BY a.id, a.matricule, a.nom, a.prenom
      ORDER BY COALESCE(SUM(pr.tonnage), 0) DESC, voyages DESC
      `,
      [weekDate]
    );

    const chauffeursQ = await db.query(
      `SELECT id, matricule, nom, prenom
         FROM agents
        WHERE fonction = 'chauffeur'
          AND actif = TRUE
        ORDER BY nom, prenom`
    );

    const chauffeurHebdoPrevQ = await db.query(
      `
      WITH semaine AS (
        SELECT ${compareStartExpr} AS debut
      )
      SELECT
        a.id AS chauffeur_id,
        a.matricule,
        a.nom,
        a.prenom,
        COALESCE(SUM(COALESCE(pr.voyages, 0)), 0)::int AS voyages_precedent,
        COALESCE(SUM(pr.tonnage), 0)::numeric AS tonnage_precedent
      FROM planifications p
      JOIN semaine s ON TRUE
      JOIN agents a ON a.id = p.chauffeur_id
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification >= s.debut
        AND p.date_planification < (s.debut + INTERVAL '7 days')
      GROUP BY a.id, a.matricule, a.nom, a.prenom
      ORDER BY COALESCE(SUM(pr.tonnage), 0) DESC, voyages_precedent DESC
      `,
      [compareReferenceDate]
    );

    const kpiHebdoQ = await db.query(
      `
      WITH semaine AS (
        SELECT date_trunc('week', $1::date) AS debut
      )
      SELECT
        COALESCE(COUNT(p.id), 0)::int AS equipages_planifies,
        COALESCE(SUM(COALESCE(pr.voyages, 0)), 0)::int AS voyages,
        COALESCE(SUM(pr.tonnage), 0)::numeric AS tonnage_hebdo
      FROM planifications p
      JOIN semaine s ON TRUE
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification >= s.debut
        AND p.date_planification < (s.debut + INTERVAL '7 days')
      `,
      [weekDate]
    );

    const kpiHebdoPrevQ = await db.query(
      `
      WITH semaine AS (
        SELECT ${compareStartExpr} AS debut
      )
      SELECT
        COALESCE(COUNT(p.id), 0)::int AS equipages_planifies,
        COALESCE(SUM(COALESCE(pr.voyages, 0)), 0)::int AS voyages,
        COALESCE(SUM(pr.tonnage), 0)::numeric AS tonnage_hebdo
      FROM planifications p
      JOIN semaine s ON TRUE
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification >= s.debut
        AND p.date_planification < (s.debut + INTERVAL '7 days')
      `,
      [compareReferenceDate]
    );

    const currentByChauffeur = chauffeurHebdoQ.rows.map((row) => ({
      ...row,
      voyages: Number(row.voyages),
      tonnage_hebdo: Number(row.tonnage_hebdo),
    }));
    const previousByChauffeur = chauffeurHebdoPrevQ.rows.map((row) => ({
      chauffeur_id: row.chauffeur_id,
      matricule: row.matricule,
      nom: row.nom,
      prenom: row.prenom,
      voyages_precedent: Number(row.voyages_precedent),
      tonnage_precedent: Number(row.tonnage_precedent),
    }));

    const currentMap = Object.fromEntries(currentByChauffeur.map((r) => [r.chauffeur_id, r]));
    const prevMap = Object.fromEntries(previousByChauffeur.map((r) => [r.chauffeur_id, r]));

    const chauffeursAvecComparatif = chauffeursQ.rows.map((row) => {
      const id = Number(row.id);
      const cur = currentMap[id] || {
        chauffeur_id: id,
        matricule: row.matricule,
        nom: row.nom,
        prenom: row.prenom,
        voyages: 0,
        tonnage_hebdo: 0,
      };
      const prev = prevMap[id] || {
        voyages_precedent: 0,
        tonnage_precedent: 0,
      };

      return {
        chauffeur_id: id,
        matricule: cur.matricule,
        nom: cur.nom,
        prenom: cur.prenom,
        voyages: cur.voyages,
        tonnage_hebdo: cur.tonnage_hebdo,
        voyages_precedent: prev.voyages_precedent,
        tonnage_precedent: prev.tonnage_precedent,
        delta_voyages: cur.voyages - prev.voyages_precedent,
        delta_tonnage: cur.tonnage_hebdo - prev.tonnage_precedent,
        delta_tonnage_pct:
          prev.tonnage_precedent > 0
            ? (((cur.tonnage_hebdo - prev.tonnage_precedent) / prev.tonnage_precedent) * 100)
            : null,
      };
    });

    const currentWeekSummary = {
      ...kpiHebdoQ.rows[0],
      voyages: Number(kpiHebdoQ.rows[0].voyages),
      tonnage_hebdo: Number(kpiHebdoQ.rows[0].tonnage_hebdo),
      equipages_planifies: Number(kpiHebdoQ.rows[0].equipages_planifies),
    };

    const previousWeekSummary = {
      ...kpiHebdoPrevQ.rows[0],
      voyages: Number(kpiHebdoPrevQ.rows[0].voyages),
      tonnage_hebdo: Number(kpiHebdoPrevQ.rows[0].tonnage_hebdo),
      equipages_planifies: Number(kpiHebdoPrevQ.rows[0].equipages_planifies),
    };

    const semaineCourante = semaineQ.rows[0];
    const semaineCompare = semaineCompareQ.rows[0];

    const hebdoCourante = {
      debut: semaineCourante.debut,
      fin: semaineCourante.fin,
      titre: `${new Date(`${semaineCourante.debut}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })} → ${new Date(`${semaineCourante.fin}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })}`,
      ...currentWeekSummary,
    };

    const hebdoPrecedente = {
      debut: semaineCompare.debut,
      fin: semaineCompare.fin,
      ...previousWeekSummary,
      titre: `${new Date(`${semaineCompare.debut}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })} → ${new Date(`${semaineCompare.fin}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })}`,
      delta_voyages: currentWeekSummary.voyages - previousWeekSummary.voyages,
      delta_tonnage: currentWeekSummary.tonnage_hebdo - previousWeekSummary.tonnage_hebdo,
    };

    res.json({
      date,
      week_date: weekDate,
      compare_week_date: compareWeekDate,
      kpis: kpisQ.rows[0],
      par_commune: parCommuneQ.rows,
      par_circuit: parCircuitQ.rows,
      tendance_7j: trendQ.rows,
      semaine: semaineQ.rows[0],
      hebdo: {
        semaine_courante: hebdoCourante,
        semaine_precedente: hebdoPrecedente,
        comparaison: {
          tonnage_delta: hebdoCourante.tonnage_hebdo - hebdoPrecedente.tonnage_hebdo,
          voyages_delta: hebdoCourante.voyages - hebdoPrecedente.voyages,
          voyages_pct:
            hebdoPrecedente.voyages > 0
              ? (((hebdoCourante.voyages - hebdoPrecedente.voyages) / hebdoPrecedente.voyages) * 100)
              : null,
          tonnage_pct:
            hebdoPrecedente.tonnage_hebdo > 0
              ? (((hebdoCourante.tonnage_hebdo - hebdoPrecedente.tonnage_hebdo) / hebdoPrecedente.tonnage_hebdo) * 100)
              : null,
        },
      },
      par_chauffeur_hebdo: chauffeurHebdoQ.rows.map((r) => ({
        ...r,
        voyages: Number(r.voyages),
        tonnage_hebdo: Number(r.tonnage_hebdo),
      })),
      par_chauffeur_hebdo_comparatif: chauffeursAvecComparatif.sort((a, b) => b.tonnage_hebdo - a.tonnage_hebdo),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
