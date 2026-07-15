// Script combiné : crée le schéma s'il n'existe pas, puis seed.
// Utilisé au déploiement initial sur Render.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("../db");

const FALLBACK_MATRICULE = "TEMP-EBOEUER3";
const DEV_DEFAULT_PASSWORD = "admin123";

function resolveInitPassword(envName, roleLabel, isRequiredInProd = true) {
  const raw = process.env[envName];
  if (raw && raw.trim()) return raw.trim();

  if (process.env.NODE_ENV === "production" || isRequiredInProd) {
    throw new Error(
      `Variable ${envName} manquante dans .env pour le compte initial ${roleLabel} en production.`
    );
  }

  console.warn(`⚠️ ${envName} non définie. Utilisation du mot de passe temporaire "${DEV_DEFAULT_PASSWORD}" pour ${roleLabel} (non recommandé en production).`);
  return DEV_DEFAULT_PASSWORD;
}

async function tableExists(tableName) {
  const r = await db.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = $1
    ) AS exists
    `,
    [tableName]
  );
  return r.rows[0].exists;
}

async function ensureFallbackEboueur3() {
  const existing = await db.query(
    "SELECT id FROM agents WHERE matricule = $1 LIMIT 1",
    [FALLBACK_MATRICULE]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const r = await db.query(
    `INSERT INTO agents (matricule, nom, prenom, fonction)
     VALUES ($1, $2, $3, 'eboueur')
     RETURNING id`,
    [FALLBACK_MATRICULE, "PRESENCE", "TEMPORAIRE"]
  );

  return r.rows[0].id;
}

async function ensurePlanificationIntegrity() {
  const hasPlanifications = await tableExists("planifications");
  if (!hasPlanifications) {
    throw new Error("La table planifications est introuvable. Lancez d'abord npm run db:init.");
  }

  // 1) Ajouter la colonne eboueur3_id si elle n'existe pas
  await db.query(`
    ALTER TABLE planifications
    ADD COLUMN IF NOT EXISTS eboueur3_id INT REFERENCES agents(id)
  `);

  // 2) Remonter les données historiques incomplètes vers un placeholder stable
  const missing = await db.query(
    "SELECT COUNT(*)::int AS nb FROM planifications WHERE eboueur3_id IS NULL"
  );
  const nbMissing = Number(missing.rows[0].nb || 0);
  if (nbMissing > 0) {
    const fallbackId = await ensureFallbackEboueur3();
    await db.query(
      "UPDATE planifications SET eboueur3_id = $1 WHERE eboueur3_id IS NULL",
      [fallbackId]
    );
    console.log(
      `⚠️ ${nbMissing} planification(s) migrées : eboueur3_id renseigné avec ${FALLBACK_MATRICULE}.`
    );
  }

  // 3) Renforcer la non-nullité seulement après correction des anciennes lignes
  await db.query(`
    ALTER TABLE planifications
    ALTER COLUMN eboueur3_id SET NOT NULL
  `);

  // 4) Ajouter l'ordre de rotation par circuit/nuit pour autoriser plusieurs équipages
  await db.query(`
    ALTER TABLE planifications
    ADD COLUMN IF NOT EXISTS rotation_no INT
  `);

  await db.query(`
    UPDATE planifications p
       SET rotation_no = ranked.rn
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY date_planification, circuit_id
                 ORDER BY created_at, id
               ) AS rn
        FROM planifications
      ) AS ranked
     WHERE p.id = ranked.id
       AND p.rotation_no IS NULL
  `);

  await db.query(`
    ALTER TABLE planifications
      ALTER COLUMN rotation_no SET DEFAULT 1,
      ALTER COLUMN rotation_no SET NOT NULL
  `);

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'planifications'::regclass
          AND conname = 'planifications_date_planification_circuit_id_key'
      ) THEN
        ALTER TABLE planifications
          DROP CONSTRAINT planifications_date_planification_circuit_id_key;
      END IF;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'planifications'::regclass
          AND conname = 'uniq_planif_rotation_par_jour'
      ) THEN
        ALTER TABLE planifications
          ADD CONSTRAINT uniq_planif_rotation_par_jour
          UNIQUE (date_planification, circuit_id, rotation_no);
      END IF;
    END $$;
  `);

  // 5) Ré-application idempotente de la contrainte d'unicité des 4 agents
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'planifications'::regclass
          AND conname = 'chk_planif_agents_distinct'
      ) THEN
        ALTER TABLE planifications
          ADD CONSTRAINT chk_planif_agents_distinct
          CHECK (
            chauffeur_id <> eboueur1_id
            AND chauffeur_id <> eboueur2_id
            AND chauffeur_id <> eboueur3_id
            AND eboueur1_id  <> eboueur2_id
            AND eboueur1_id  <> eboueur3_id
            AND eboueur2_id  <> eboueur3_id
          );
      END IF;
    END $$;
  `);

  // Contrôle de présence de la contrainte
  const collation = await db.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'planifications'::regclass
        AND conname = 'chk_planif_agents_distinct'
    ) AS exists
    `
  );
  if (!collation.rows[0].exists) {
    throw new Error("La contrainte chk_planif_agents_distinct n'a pas pu être créée.");
  }

  // 6) Règle : un même éboueur ne peut apparaître qu'une seule fois par nuit (toutes colonnes confondues)
  await db.query(`
    CREATE OR REPLACE FUNCTION public.prevent_duplicate_eboueurs_per_jour()
    RETURNS TRIGGER AS $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM planifications p
        WHERE p.date_planification = NEW.date_planification
          AND p.id <> COALESCE(NEW.id, 0)
          AND (
            p.eboueur1_id IN (NEW.eboueur1_id, NEW.eboueur2_id, NEW.eboueur3_id)
            OR p.eboueur2_id IN (NEW.eboueur1_id, NEW.eboueur2_id, NEW.eboueur3_id)
            OR p.eboueur3_id IN (NEW.eboueur1_id, NEW.eboueur2_id, NEW.eboueur3_id)
          )
      ) THEN
        RAISE EXCEPTION 'Un éboueur ne peut être affecté qu''à un seul équipage pour une même nuit.'
          USING ERRCODE = '23505',
                CONSTRAINT = 'chk_planif_eboueurs_jour_uniques';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_planif_eboueurs_uniq_jour ON planifications;
    CREATE TRIGGER trg_planif_eboueurs_uniq_jour
      BEFORE INSERT OR UPDATE ON planifications
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_duplicate_eboueurs_per_jour();
  `);
}

async function ensureProductionIntegrity() {
  const hasProductions = await tableExists("productions");
  if (!hasProductions) return;

  await db.query(`
    ALTER TABLE productions
      ADD COLUMN IF NOT EXISTS voyages INT
  `);

  await db.query(`
    UPDATE productions
       SET voyages = COALESCE(voyages, 0)
     WHERE voyages IS NULL
  `);

  await db.query(`
    ALTER TABLE productions
      ALTER COLUMN voyages SET DEFAULT 0,
      ALTER COLUMN voyages SET NOT NULL
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'productions'::regclass
          AND conname = 'productions_voyages_non_negatifs'
      ) THEN
        ALTER TABLE productions
          ADD CONSTRAINT productions_voyages_non_negatifs CHECK (voyages >= 0);
      END IF;
    END $$
  `);

  await db.query(`
    ALTER TABLE productions
      ADD COLUMN IF NOT EXISTS taux_traitement NUMERIC(5,2)
  `);

  await db.query(`
    UPDATE productions
       SET taux_traitement = COALESCE(taux_traitement, 0)
     WHERE taux_traitement IS NULL
  `);

  await db.query(`
    ALTER TABLE productions
      ALTER COLUMN taux_traitement SET DEFAULT 0,
      ALTER COLUMN taux_traitement SET NOT NULL
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'productions'::regclass
          AND conname = 'productions_taux_traitement_borne'
      ) THEN
        ALTER TABLE productions
          ADD CONSTRAINT productions_taux_traitement_borne
          CHECK (taux_traitement >= 0 AND taux_traitement <= 100);
      END IF;
    END $$
  `);
}

async function main() {
  console.log("🔧 Vérification du schéma...");

  // Vérifier si la table users existe déjà
  const r = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'users'
    ) AS exists
  `);

  if (r.rows[0].exists) {
    await ensurePlanificationIntegrity();
    await ensureProductionIntegrity();
    console.log("✓ Schéma déjà présent, migration minimale appliquée.");
    process.exit(0);
  }

  console.log("📦 Création du schéma...");
  const sql = fs.readFileSync(path.join(__dirname, "../../sql/01_schema.sql"), "utf8");
  await db.query(sql);
  console.log("✅ Schéma créé.");

  console.log("🌱 Insertion des données initiales...");

  const adminInitPassword = resolveInitPassword("ADMIN_INIT_PASSWORD", "administrateur");
  const superInitPassword = resolveInitPassword("SUPERVISEUR_INIT_PASSWORD", "superviseur");
  const adminPwd = await bcrypt.hash(adminInitPassword, 10);
  const supPwd = await bcrypt.hash(superInitPassword, 10);

  await db.query(
    `INSERT INTO users (nom, email, password_hash, role) VALUES
        ('Administrateur', 'admin@ecomanager.ci', $1, 'admin'),
        ('Superviseur Nuit', 'superviseur@ecomanager.ci', $2, 'superviseur')
       ON CONFLICT (email) DO NOTHING`,
    [adminPwd, supPwd]
  );

  const communes = ["Port-Bouët", "Koumassi", "Marcory", "Treichville"];
  for (const c of communes) {
    await db.query("INSERT INTO communes (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING", [c]);
  }
  const cm = (await db.query("SELECT id, nom FROM communes")).rows.reduce(
    (acc, r) => ({ ...acc, [r.nom]: r.id }), {}
  );

  const circuits = [
    ["101", "Port-Bouët"], ["102", "Port-Bouët"],
    ["106", "Koumassi"], ["107", "Koumassi"], ["108", "Koumassi"],
    ["109", "Marcory"], ["110", "Marcory"],
    ["104", "Treichville"],
  ];
  for (const [code, commune] of circuits) {
    await db.query(
      "INSERT INTO circuits (code, commune_id) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
      [code, cm[commune]]
    );
  }

  await db.query(
    `INSERT INTO centres_transfert (nom, adresse)
     VALUES ('Centre de transfert Akouédo', 'Abidjan')
     ON CONFLICT (nom) DO NOTHING`
  );

  const chauffeurs = [
    ["M0234","KOUASSI","Jean"],["M0156","DIABATÉ","Issa"],
    ["M0089","TRAORÉ","Mamadou"],["M0312","YAO","Konan"],
    ["M0445","BAMBA","Sékou"],["M0278","OUATTARA","Adama"],
    ["M0367","KONÉ","Drissa"],["M0521","N'GUESSAN","Paul"],
  ];
  for (const [m, n, p] of chauffeurs) {
    await db.query(
      `INSERT INTO agents (matricule, nom, prenom, fonction)
       VALUES ($1,$2,$3,'chauffeur')
       ON CONFLICT (matricule) DO NOTHING`,
      [m, n, p]
    );
  }

  const eboueurs = [
    ["E0101","KOFFI","Eric"],["E0102","DIALLO","Amadou"],
    ["E0103","SORO","Lamine"],["E0104","COULIBALY","Ali"],
    ["E0105","TOURÉ","Ibrahim"],["E0106","BAKAYOKO","Yssouf"],
    ["E0107","DJÉ","Marc"],["E0108","FOFANA","Souleymane"],
    ["E0109","ZOUNGRANA","Boukary"],["E0110","SANOGO","Vagba"],
    ["E0111","CISSÉ","Moussa"],["E0112","DOUMBIA","Karim"],
    ["E0113","KOUADIO","Yves"],["E0114","TANO","Hervé"],
    ["E0115","BROU","Aimé"],["E0116","ASSI","Désiré"],
  ];
  for (const [m, n, p] of eboueurs) {
    await db.query(
      `INSERT INTO agents (matricule, nom, prenom, fonction)
       VALUES ($1,$2,$3,'eboueur')
       ON CONFLICT (matricule) DO NOTHING`,
      [m, n, p]
    );
  }

  const vehicules = [
    ["CI-2341-AB","Benne 12T"],["CI-2398-AB","Benne 12T"],
    ["CI-2412-CD","Benne 16T"],["CI-2455-CD","Benne 16T"],
    ["CI-2467-CD","Benne 12T"],["CI-2501-EF","Benne 12T"],
    ["CI-2523-EF","Benne 16T"],["CI-2589-GH","Benne 12T"],
  ];
  for (const [im, t] of vehicules) {
    await db.query(
      `INSERT INTO vehicules (immatriculation, type)
       VALUES ($1,$2) ON CONFLICT (immatriculation) DO NOTHING`,
      [im, t]
    );
  }

  console.log("✅ Initialisation complète.");
  console.log("   Compte admin@ecomanager.ci configuré");
  console.log("   Compte superviseur@ecomanager.ci configuré");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  });
