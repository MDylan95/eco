require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../db");

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

(async () => {
  try {
    // ----- Utilisateurs -----
    const adminPwd = await bcrypt.hash(
      resolveInitPassword("ADMIN_INIT_PASSWORD", "administrateur"),
      10
    );
    const supPwd = await bcrypt.hash(
      resolveInitPassword("SUPERVISEUR_INIT_PASSWORD", "superviseur"),
      10
    );

    await db.query(
      `INSERT INTO users (nom, email, password_hash, role) VALUES
        ('Administrateur', 'admin@ecomanager.ci', $1, 'admin'),
        ('Superviseur Nuit', 'superviseur@ecomanager.ci', $2, 'superviseur')
       ON CONFLICT (email) DO NOTHING`,
      [adminPwd, supPwd]
    );

    // ----- Communes du secteur 3 -----
    const communes = ["Port-Bouët", "Koumassi", "Marcory", "Treichville"];
    for (const c of communes) {
      await db.query(
        "INSERT INTO communes (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING",
        [c]
      );
    }

    const cm = (await db.query("SELECT id, nom FROM communes")).rows.reduce(
      (acc, r) => ({ ...acc, [r.nom]: r.id }),
      {}
    );

    // ----- Circuits -----
    const circuits = [
      ["101", "Port-Bouët"],
      ["102", "Port-Bouët"],
      ["106", "Koumassi"],
      ["107", "Koumassi"],
      ["108", "Koumassi"],
      ["109", "Marcory"],
      ["110", "Marcory"],
      ["104", "Treichville"],
    ];
    for (const [code, commune] of circuits) {
      await db.query(
        "INSERT INTO circuits (code, commune_id) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
        [code, cm[commune]]
      );
    }

    // ----- Centre de transfert -----
    await db.query(
      `INSERT INTO centres_transfert (nom, adresse)
       VALUES ('Centre de transfert Akouédo', 'Abidjan')
       ON CONFLICT (nom) DO NOTHING`
    );

    // ----- Agents de test -----
    const chauffeurs = [
      ["M0234", "KOUASSI", "Jean"],
      ["M0156", "DIABATÉ", "Issa"],
      ["M0089", "TRAORÉ", "Mamadou"],
      ["M0312", "YAO", "Konan"],
      ["M0445", "BAMBA", "Sékou"],
      ["M0278", "OUATTARA", "Adama"],
      ["M0367", "KONÉ", "Drissa"],
      ["M0521", "N'GUESSAN", "Paul"],
    ];
    for (const [matricule, nom, prenom] of chauffeurs) {
      await db.query(
        `INSERT INTO agents (matricule, nom, prenom, fonction)
         VALUES ($1,$2,$3,'chauffeur') ON CONFLICT (matricule) DO NOTHING`,
        [matricule, nom, prenom]
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
    for (const [matricule, nom, prenom] of eboueurs) {
      await db.query(
        `INSERT INTO agents (matricule, nom, prenom, fonction)
         VALUES ($1,$2,$3,'eboueur') ON CONFLICT (matricule) DO NOTHING`,
        [matricule, nom, prenom]
      );
    }

    // ----- Véhicules -----
    const vehicules = [
      ["CI-2341-AB", "Benne 12T"],
      ["CI-2398-AB", "Benne 12T"],
      ["CI-2412-CD", "Benne 16T"],
      ["CI-2455-CD", "Benne 16T"],
      ["CI-2467-CD", "Benne 12T"],
      ["CI-2501-EF", "Benne 12T"],
      ["CI-2523-EF", "Benne 16T"],
      ["CI-2589-GH", "Benne 12T"],
    ];
    for (const [immat, type] of vehicules) {
      await db.query(
        `INSERT INTO vehicules (immatriculation, type) VALUES ($1,$2)
         ON CONFLICT (immatriculation) DO NOTHING`,
        [immat, type]
      );
    }

    console.log("✅ Données initiales insérées");
    console.log("   → Compte administrateur configuré");
    console.log("   → Compte superviseur configuré");
    process.exit(0);
  } catch (e) {
    console.error("❌ Erreur seed :", e.message);
    process.exit(1);
  }
})();
