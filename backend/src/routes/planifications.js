const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

function normalizeDate(value) {
  const date = String(value || "").trim();
  const match = /^([0-9]{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;

  // Vérification stricte : ne pas accepter 2026-02-30 par ex.
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

function normalizeText(value) {
  return String(value || "").trim();
}

// GET /api/planifications?date=YYYY-MM-DD
router.get("/", authRequired, async (req, res) => {
  const normalizedDate = req.query.date ? normalizeDate(req.query.date) : new Date().toISOString().slice(0, 10);

  if (req.query.date && !normalizedDate) {
    return res.status(400).json({ error: "Format de date invalide (YYYY-MM-DD attendu)" });
  }

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
        e3.id AS eboueur3_id, e3.matricule AS eboueur3_matricule,
        e3.nom AS eboueur3_nom, e3.prenom AS eboueur3_prenom,
        v.id AS vehicule_id, v.immatriculation AS vehicule_immat,
        v.type AS vehicule_type,
        pr.tonnage, pr.date_saisie AS tonnage_date,
        CASE WHEN pr.id IS NULL THEN 'pending' ELSE 'done' END AS statut
      FROM planifications p
      JOIN circuits ci ON ci.id = p.circuit_id
      JOIN communes co ON co.id = ci.commune_id
      JOIN agents ch   ON ch.id = p.chauffeur_id
      JOIN agents e1   ON e1.id = p.eboueur1_id
      JOIN agents e2   ON e2.id = p.eboueur2_id
      LEFT JOIN agents e3  ON e3.id = p.eboueur3_id
      JOIN vehicules v ON v.id = p.vehicule_id
      LEFT JOIN productions pr ON pr.planification_id = p.id
      WHERE p.date_planification = $1
      ORDER BY ci.code
    `,
      [normalizedDate]
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
    eboueur3_id,
    vehicule_id,
    vehicule_immatriculation,
    vehicule_type,
  } = req.body;

  const date = normalizeDate(normalizeText(date_planification));

  if (!date) {
    return res.status(400).json({ error: "La date est invalide (format YYYY-MM-DD attendu)" });
  }

  const data = {
    circuit_id: normalizeInt(circuit_id),
    chauffeur_id: normalizeInt(chauffeur_id),
    eboueur1_id: normalizeInt(eboueur1_id),
    eboueur2_id: normalizeInt(eboueur2_id),
    eboueur3_id: normalizeInt(eboueur3_id),
    vehicule_id: normalizeInt(vehicule_id),
  };

  if (!data.circuit_id || !data.chauffeur_id || !data.eboueur1_id || !data.eboueur2_id || !data.eboueur3_id) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }

  const agentIds = [data.chauffeur_id, data.eboueur1_id, data.eboueur2_id, data.eboueur3_id];
  const uniqueAgents = new Set(agentIds);
  if (uniqueAgents.size !== 4) {
    return res.status(400).json({ error: "Chauffeur et 3 éboueurs doivent être différents" });
  }

  const circuitRef = await db.query(
    "SELECT actif FROM circuits WHERE id = $1",
    [data.circuit_id]
  );
  if (circuitRef.rowCount === 0) {
    return res.status(400).json({ error: "Circuit introuvable" });
  }
  if (!circuitRef.rows[0].actif) {
    return res.status(409).json({ error: "Circuit désactivé" });
  }

  let finalVehiculeId = data.vehicule_id;
  if (!finalVehiculeId && !vehicule_immatriculation) {
    return res.status(400).json({ error: "Le véhicule est requis" });
  }

  try {
    const agents = await db.query(
      "SELECT id, fonction, actif FROM agents WHERE id = ANY($1::int[])",
      [agentIds]
    );

    if (agents.rowCount !== 4) {
      return res.status(400).json({ error: "Un ou plusieurs agents introuvables" });
    }

    const actorMap = Object.fromEntries(agents.rows.map((row) => [row.id, row]));
    if (!actorMap[data.chauffeur_id]?.actif || actorMap[data.chauffeur_id]?.fonction !== "chauffeur") {
      return res.status(400).json({ error: "Le chauffeur doit être actif et de fonction chauffeur" });
    }
    const eboueurChecks = [data.eboueur1_id, data.eboueur2_id, data.eboueur3_id].every((id) => {
      const actor = actorMap[id];
      return actor?.actif && actor?.fonction === "eboueur";
    });
    if (!eboueurChecks) {
      return res.status(400).json({ error: "Tous les éboueurs doivent être actifs et de fonction éboueur" });
    }

    if (!finalVehiculeId) {
      const imm = normalizeText(vehicule_immatriculation).toUpperCase();
      if (!imm) {
        return res.status(400).json({ error: "Immatriculation du véhicule requise" });
      }

      const normalizedType = normalizeText(vehicule_type) || null;
      const existing = await db.query(
        "SELECT id, type, actif FROM vehicules WHERE immatriculation = $1",
        [imm]
      );

      if (existing.rowCount > 0) {
        finalVehiculeId = existing.rows[0].id;
        if (!existing.rows[0].actif) {
          return res.status(400).json({ error: "Le véhicule saisi est désactivé" });
        }
        if (normalizedType && existing.rows[0].type !== normalizedType) {
          await db.query("UPDATE vehicules SET type = $1 WHERE id = $2", [normalizedType, finalVehiculeId]);
        }
      } else {
        const insertVehicule = await db.query(
          "INSERT INTO vehicules (immatriculation, type) VALUES ($1, $2) RETURNING id",
          [imm, normalizedType]
        );
        finalVehiculeId = insertVehicule.rows[0].id;
      }
    }

    // Vérification: éboueurs/chauffeur déjà affectés ce jour-là ?
    const check = await db.query(
      `SELECT 1 FROM planifications
       WHERE date_planification = $1
         AND (
           chauffeur_id = ANY($2::int[]) OR
           eboueur1_id = ANY($2::int[]) OR
           eboueur2_id = ANY($2::int[]) OR
           (eboueur3_id IS NOT NULL AND eboueur3_id = ANY($2::int[]))
         )
      `,
      [date, agentIds]
    );

    if (check.rowCount > 0) {
      return res.status(409).json({ error: "Un agent est déjà affecté à un autre circuit ce jour" });
    }

    const vehiculeCheck = await db.query(
      "SELECT actif FROM vehicules WHERE id = $1",
      [finalVehiculeId]
    );
    if (vehiculeCheck.rowCount === 0 || !vehiculeCheck.rows[0].actif) {
      return res.status(400).json({ error: "Le véhicule est invalide ou désactivé" });
    }

    const r = await db.query(
      `INSERT INTO planifications
       (date_planification, circuit_id, chauffeur_id, eboueur1_id, eboueur2_id, eboueur3_id, vehicule_id, superviseur_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [date, data.circuit_id, data.chauffeur_id, data.eboueur1_id, data.eboueur2_id, data.eboueur3_id, finalVehiculeId, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      if (e.constraint === "uniq_chauffeur_par_jour") {
        return res.status(409).json({ error: "Le chauffeur est déjà affecté à un autre circuit ce jour." });
      }
      if (e.constraint === "uniq_vehicule_par_jour") {
        return res.status(409).json({ error: "Le véhicule est déjà utilisé ce jour sur un autre circuit." });
      }
      if (e.constraint === "chk_planif_agents_distinct") {
        return res.status(400).json({ error: "Chauffeur et éboueurs doivent être distincts." });
      }
      if (e.constraint === "chk_planif_eboueurs_jour_uniques") {
        return res.status(409).json({ error: "Un même éboueur est déjà affecté à un autre équipage ce jour." });
      }
      return res.status(409).json({
        error: "Conflit : circuit, chauffeur, éboueur ou véhicule déjà affecté ce jour",
      });
    }
    if (e.code === "23503") {
      return res.status(400).json({ error: "Une référence fournie n'existe pas (circuit, agents ou véhicule)." });
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
