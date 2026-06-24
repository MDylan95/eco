const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/productions  ·  étape 2 : saisie du tonnage
router.post("/", authRequired, requireRole("admin", "superviseur"), async (req, res) => {
  const { planification_id, tonnage } = req.body;
  const planificationId = Number(planification_id);
  const tonnageNum = Number(tonnage);
  const hasVoyages = req.body.voyages != null && req.body.voyages !== "";
  const hasTaux = req.body.taux_traitement != null && req.body.taux_traitement !== "";

  const voyagesInput = req.body.voyages;
  const tauxInput = req.body.taux_traitement;
  const voyagesNum = hasVoyages ? Number(voyagesInput) : null;
  const tauxNum = hasTaux ? Number(tauxInput) : null;

  if (!Number.isInteger(planificationId) || planificationId <= 0) {
    return res.status(400).json({ error: "planification_id invalide" });
  }

  if (!Number.isFinite(tonnageNum) || tonnageNum < 0) {
    return res.status(400).json({ error: "Tonnage invalide (nombre positif attendu)" });
  }

  if (tonnageNum > 999999.99) {
    return res.status(400).json({ error: "Le tonnage est trop élevé" });
  }

  if (hasVoyages) {
    if (!Number.isInteger(voyagesNum) || voyagesNum < 0) {
      return res.status(400).json({ error: "Nombre de voyage invalide (entier positif attendu)" });
    }
  }

  if (hasTaux) {
    if (!Number.isFinite(tauxNum) || tauxNum < 0 || tauxNum > 100) {
      return res.status(400).json({ error: "Taux de traitement invalide (0 à 100 attendu)" });
    }
  }

  try {
    // Récupération du centre de transfert unique
    const ct = await db.query("SELECT id FROM centres_transfert ORDER BY id LIMIT 1");
    const centreId = ct.rows[0]?.id || null;

    const r = await db.query(
      `INSERT INTO productions
       (planification_id, tonnage, voyages, taux_traitement, centre_transfert_id, saisi_par)
       VALUES ($1, $2, COALESCE($3, 0)::int, COALESCE($4, 0)::numeric, $5, $6)
       ON CONFLICT (planification_id)
       DO UPDATE SET tonnage = EXCLUDED.tonnage,
                     voyages = CASE WHEN $7 THEN EXCLUDED.voyages ELSE productions.voyages END,
                     taux_traitement = CASE WHEN $8 THEN EXCLUDED.taux_traitement ELSE productions.taux_traitement END,
                     saisi_par = EXCLUDED.saisi_par,
                     date_saisie = NOW()
       RETURNING *`,
      [planificationId, tonnageNum, voyagesNum, tauxNum, centreId, req.user.id, hasVoyages, hasTaux]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23503") {
      return res.status(404).json({ error: "La planification demandée n'existe pas." });
    }
    if (e.code === "23505") {
      return res.status(409).json({ error: "Tonnage déjà saisi pour cette planification." });
    }
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
