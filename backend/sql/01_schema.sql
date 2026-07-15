-- ============================================================================
-- ECO MANAGER · Schéma de base de données
-- PostgreSQL 13+
-- ============================================================================

DROP TABLE IF EXISTS productions CASCADE;
DROP TABLE IF EXISTS absences CASCADE;
DROP TABLE IF EXISTS planifications CASCADE;
DROP TABLE IF EXISTS circuits CASCADE;
DROP TABLE IF EXISTS communes CASCADE;
DROP TABLE IF EXISTS centres_transfert CASCADE;
DROP TABLE IF EXISTS vehicules CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------------------
-- Utilisateurs de la plateforme (admin, superviseur, consultation)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(120) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin','superviseur','consultation')),
  actif         BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMP    DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Personnel : chauffeurs et éboueurs
-- ---------------------------------------------------------------------------
CREATE TABLE agents (
  id         SERIAL PRIMARY KEY,
  matricule  VARCHAR(20) UNIQUE NOT NULL,
  nom        VARCHAR(100) NOT NULL,
  prenom     VARCHAR(100) NOT NULL,
  fonction   VARCHAR(20)  NOT NULL CHECK (fonction IN ('chauffeur','eboueur')),
  actif      BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_agents_fonction ON agents(fonction) WHERE actif = TRUE;

-- ---------------------------------------------------------------------------
-- Véhicules
-- ---------------------------------------------------------------------------
CREATE TABLE vehicules (
  id              SERIAL PRIMARY KEY,
  immatriculation VARCHAR(20) UNIQUE NOT NULL,
  type            VARCHAR(50),
  actif           BOOLEAN     DEFAULT TRUE,
  created_at      TIMESTAMP   DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Communes du secteur 3
-- ---------------------------------------------------------------------------
CREATE TABLE communes (
  id  SERIAL PRIMARY KEY,
  nom VARCHAR(100) UNIQUE NOT NULL
);

-- ---------------------------------------------------------------------------
-- Circuits par commune
-- ---------------------------------------------------------------------------
CREATE TABLE circuits (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(10) UNIQUE NOT NULL,
  commune_id INT NOT NULL REFERENCES communes(id),
  actif      BOOLEAN DEFAULT TRUE
);

-- ---------------------------------------------------------------------------
-- Centre de transfert
-- ---------------------------------------------------------------------------
CREATE TABLE centres_transfert (
  id      SERIAL PRIMARY KEY,
  nom     VARCHAR(100) NOT NULL UNIQUE,
  adresse TEXT
);

-- ---------------------------------------------------------------------------
-- Planification journalière (étape 1)
-- 1 équipage = 1 chauffeur + 3 éboueurs + 1 véhicule sur 1 circuit
-- ---------------------------------------------------------------------------
CREATE TABLE planifications (
  id                 SERIAL PRIMARY KEY,
  date_planification DATE NOT NULL,
  circuit_id         INT  NOT NULL REFERENCES circuits(id),
  rotation_no        INT  NOT NULL DEFAULT 1 CHECK (rotation_no > 0),
  chauffeur_id       INT  NOT NULL REFERENCES agents(id),
  eboueur1_id        INT  NOT NULL REFERENCES agents(id),
  eboueur2_id        INT  NOT NULL REFERENCES agents(id),
  eboueur3_id        INT  NOT NULL REFERENCES agents(id),
  vehicule_id        INT  NOT NULL REFERENCES vehicules(id),
  superviseur_id     INT  REFERENCES users(id),
  created_at         TIMESTAMP DEFAULT NOW(),

  -- Plusieurs rotations possibles sur un même circuit dans la même nuit
  UNIQUE (date_planification, circuit_id, rotation_no),

  -- Les 3 agents de l'équipage doivent être distincts
  CHECK (chauffeur_id <> eboueur1_id
     AND chauffeur_id <> eboueur2_id
     AND chauffeur_id <> eboueur3_id
     AND eboueur1_id  <> eboueur2_id
     AND eboueur1_id  <> eboueur3_id
     AND eboueur2_id  <> eboueur3_id)
);

-- Un chauffeur ne peut conduire qu'un seul circuit par nuit
CREATE UNIQUE INDEX uniq_chauffeur_par_jour
  ON planifications (date_planification, chauffeur_id);

-- Un véhicule ne peut être affecté qu'à un seul circuit par nuit
CREATE UNIQUE INDEX uniq_vehicule_par_jour
  ON planifications (date_planification, vehicule_id);

-- Contrôle d'unicité des éboueurs sur la journée (toutes colonnes confondues)
CREATE OR REPLACE FUNCTION prevent_duplicate_eboueurs_per_jour()
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

CREATE TRIGGER trg_planif_eboueurs_uniq_jour
  BEFORE INSERT OR UPDATE ON planifications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_eboueurs_per_jour();

CREATE INDEX idx_planif_date ON planifications(date_planification);

-- ---------------------------------------------------------------------------
-- Production (étape 2) : tonnage saisi après déchargement
-- 1 planification = 1 production max (une seule rotation par nuit)
-- ---------------------------------------------------------------------------
CREATE TABLE productions (
  id                  SERIAL PRIMARY KEY,
  planification_id    INT UNIQUE NOT NULL REFERENCES planifications(id) ON DELETE CASCADE,
  tonnage             NUMERIC(6,2) NOT NULL CHECK (tonnage >= 0),
  voyages             INTEGER NOT NULL DEFAULT 0 CHECK (voyages >= 0),
  taux_traitement     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (taux_traitement >= 0 AND taux_traitement <= 100),
  centre_transfert_id INT REFERENCES centres_transfert(id),
  saisi_par           INT REFERENCES users(id),
  date_saisie         TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Absences et remplacements
-- ---------------------------------------------------------------------------
CREATE TABLE absences (
  id            SERIAL PRIMARY KEY,
  agent_id      INT  NOT NULL REFERENCES agents(id),
  date_absence  DATE NOT NULL,
  remplacant_id INT  REFERENCES agents(id),
  motif         VARCHAR(200),
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (agent_id, date_absence)
);
