// Script combiné : crée le schéma s'il n'existe pas, puis seed.
// Utilisé au déploiement initial sur Render.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("../db");

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
    console.log("✓ Schéma déjà présent, rien à faire.");
    process.exit(0);
  }

  console.log("📦 Création du schéma...");
  const sql = fs.readFileSync(path.join(__dirname, "../../sql/01_schema.sql"), "utf8");
  await db.query(sql);
  console.log("✅ Schéma créé.");

  console.log("🌱 Insertion des données initiales...");

  const adminPwd = await bcrypt.hash("admin123", 10);
  const supPwd = await bcrypt.hash("super123", 10);

  await db.query(
    `INSERT INTO users (nom, email, password_hash, role) VALUES
      ('Administrateur', 'admin@ecomanager.ci', $1, 'admin'),
      ('Superviseur Nuit', 'superviseur@ecomanager.ci', $2, 'superviseur')`,
    [adminPwd, supPwd]
  );

  const communes = ["Port-Bouët", "Koumassi", "Marcory", "Treichville"];
  for (const c of communes) {
    await db.query("INSERT INTO communes (nom) VALUES ($1)", [c]);
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
    await db.query("INSERT INTO circuits (code, commune_id) VALUES ($1, $2)", [code, cm[commune]]);
  }

  await db.query(
    `INSERT INTO centres_transfert (nom, adresse) VALUES ('Centre de transfert Akouédo', 'Abidjan')`
  );

  const chauffeurs = [
    ["M0234","KOUASSI","Jean"],["M0156","DIABATÉ","Issa"],
    ["M0089","TRAORÉ","Mamadou"],["M0312","YAO","Konan"],
    ["M0445","BAMBA","Sékou"],["M0278","OUATTARA","Adama"],
    ["M0367","KONÉ","Drissa"],["M0521","N'GUESSAN","Paul"],
  ];
  for (const [m, n, p] of chauffeurs) {
    await db.query(
      `INSERT INTO agents (matricule, nom, prenom, fonction) VALUES ($1,$2,$3,'chauffeur')`,
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
      `INSERT INTO agents (matricule, nom, prenom, fonction) VALUES ($1,$2,$3,'eboueur')`,
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
      `INSERT INTO vehicules (immatriculation, type) VALUES ($1,$2)`,
      [im, t]
    );
  }

  console.log("✅ Initialisation complète.");
  console.log("   admin@ecomanager.ci / admin123");
  console.log("   superviseur@ecomanager.ci / super123");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  });
