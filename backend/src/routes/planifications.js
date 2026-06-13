const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/planifications?date=YYYY-MM-DD
router.get("/", authRequired, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const r = await db.query(
      `
      SELECT
        p.id, p.date_planification,
        ci.id AS circuit_id, ci.code AS circuit_code,
        co.id AS commune_id, co.nom AS commune,
        ch.id AS chauffeur_id, ch.matricule AS chauffeur_matricule,
        ch.nom AS chauffeur_nom, ch.prenom AS chauffeur_prenom,
        e1.id AS eboueur1_id, e1.matricule AS eboueur1_matricule,
        e1.nom AS eboueur1_nom, e1.prenom AS eboueur1_prenom,
        e2.id AS eboueur2_id, e2.matricule AS eboueur2_matricule,
        e2.nom AS eboueur2_nom, e2.prenom AS eboueur2_prenom,
        v.id AS vehicule_id, v.immatriculation AS vehicule_immat,
        pr.tonnage, pr.date_saisie AS tonnage_date,
        CASE WHEN pr.id IS NULL THEN 'pending' ELSE 'done' END AS statut
      FROM planifications p
      JOIN circuits ci ON ci.id = p.circuit_id
      JOIN communes co ON co.id = ci.commune_id
      JOIN agents ch   ON ch.id = p.chauffeur_id
      JOIN agents e1   ON e1.id = p.eboueur1_id
      JOIN agents e2   ON e2.id = p.eboueur2_id
      JOIN vehicules v ON v.id = p.vehicule_id
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification = $1
      ORDER BY ci.code
    `,
      [date]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/planifications  ·  étape 1 : créer un équipage du jour
router.post("/", authRequired, requireRole("admin", "superviseur"), async (req, res) => {
  const {
    date_planification,
    circuit_id,
    chauffeur_id,
    eboueur1_id,
    eboueur2_id,
    vehicule_id,
  } = req.body;

  if (!date_planification || !circuit_id || !chauffeur_id || !eboueur1_id || !eboueur2_id || !vehicule_id) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }
  if (
    chauffeur_id === eboueur1_id ||
    chauffeur_id === eboueur2_id ||
    eboueur1_id === eboueur2_id
  ) {
    return res.status(400).json({ error: "Les trois agents doivent être distincts" });
  }

  try {
    // Vérification: éboueurs déjà affectés ce jour-là ?
    const check = await db.query(
      `SELECT 1 FROM planifications
       WHERE date_planification = $1
         AND ($2 IN (eboueur1_id, eboueur2_id, chauffeur_id)
           OR $3 IN (eboueur1_id, eboueur2_id, chauffeur_id))`,
      [date_planification, eboueur1_id, eboueur2_id]
    );
    if (check.rowCount > 0) {
      return res.status(409).json({ error: "Un éboueur est déjà affecté à un autre circuit ce jour" });
    }

    const r = await db.query(
      `INSERT INTO planifications
       (date_planification, circuit_id, chauffeur_id, eboueur1_id, eboueur2_id, vehicule_id, superviseur_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [date_planification, circuit_id, chauffeur_id, eboueur1_id, eboueur2_id, vehicule_id, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({
        error: "Conflit : circuit, chauffeur ou véhicule déjà affecté ce jour",
      });
    }
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/planifications/:id
router.delete("/:id", authRequired, requireRole("admin", "superviseur"), async (req, res) => {
  try {
    const r = await db.query("DELETE FROM planifications WHERE id = $1", [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Planification introuvable" });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
