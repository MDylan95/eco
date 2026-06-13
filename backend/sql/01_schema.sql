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
  nom     VARCHAR(100) NOT NULL,
  adresse TEXT
);

-- ---------------------------------------------------------------------------
-- Planification journalière (étape 1)
-- 1 équipage = 1 chauffeur + 2 éboueurs + 1 véhicule sur 1 circuit
-- ---------------------------------------------------------------------------
CREATE TABLE planifications (
  id                 SERIAL PRIMARY KEY,
  date_planification DATE NOT NULL,
  circuit_id         INT  NOT NULL REFERENCES circuits(id),
  chauffeur_id       INT  NOT NULL REFERENCES agents(id),
  eboueur1_id        INT  NOT NULL REFERENCES agents(id),
  eboueur2_id        INT  NOT NULL REFERENCES agents(id),
  vehicule_id        INT  NOT NULL REFERENCES vehicules(id),
  superviseur_id     INT  REFERENCES users(id),
  created_at         TIMESTAMP DEFAULT NOW(),

  -- Un circuit ne peut être planifié qu'une fois par jour
  UNIQUE (date_planification, circuit_id),

  -- Les 3 agents de l'équipage doivent être distincts
  CHECK (chauffeur_id <> eboueur1_id
     AND chauffeur_id <> eboueur2_id
     AND eboueur1_id  <> eboueur2_id)
);

-- Un chauffeur ne peut conduire qu'un seul circuit par nuit
CREATE UNIQUE INDEX uniq_chauffeur_par_jour
  ON planifications (date_planification, chauffeur_id);

-- Un véhicule ne peut être affecté qu'à un seul circuit par nuit
CREATE UNIQUE INDEX uniq_vehicule_par_jour
  ON planifications (date_planification, vehicule_id);

-- (Le contrôle d'unicité des éboueurs sur la journée est fait côté backend
--  car ils peuvent occuper deux colonnes différentes)

CREATE INDEX idx_planif_date ON planifications(date_planification);

-- ---------------------------------------------------------------------------
-- Production (étape 2) : tonnage saisi après déchargement
-- 1 planification = 1 production max (une seule rotation par nuit)
-- ---------------------------------------------------------------------------
CREATE TABLE productions (
  id                  SERIAL PRIMARY KEY,
  planification_id    INT UNIQUE NOT NULL REFERENCES planifications(id) ON DELETE CASCADE,
  tonnage             NUMERIC(6,2) NOT NULL CHECK (tonnage >= 0),
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
