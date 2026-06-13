const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/productions  ·  étape 2 : saisie du tonnage
router.post("/", authRequired, requireRole("admin", "superviseur"), async (req, res) => {
  const { planification_id, tonnage } = req.body;
  if (!planification_id || tonnage === undefined || tonnage === null) {
    return res.status(400).json({ error: "planification_id et tonnage requis" });
  }
  if (Number(tonnage) < 0) {
    return res.status(400).json({ error: "Le tonnage doit être positif" });
  }

  try {
    // Récupération du centre de transfert unique
    const ct = await db.query("SELECT id FROM centres_transfert ORDER BY id LIMIT 1");
    const centreId = ct.rows[0]?.id || null;

    const r = await db.query(
      `INSERT INTO productions (planification_id, tonnage, centre_transfert_id, saisi_par)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (planification_id)
       DO UPDATE SET tonnage = EXCLUDED.tonnage,
                     saisi_par = EXCLUDED.saisi_par,
                     date_saisie = NOW()
       RETURNING *`,
      [planification_id, tonnage, centreId, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
