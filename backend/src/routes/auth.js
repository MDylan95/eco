const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  try {
    const r = await db.query(
      "SELECT id, nom, email, password_hash, role, actif FROM users WHERE email = $1",
      [email]
    );
    if (r.rowCount === 0) return res.status(401).json({ error: "Identifiants invalides" });
    const u = r.rows[0];
    if (!u.actif) return res.status(403).json({ error: "Compte désactivé" });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Identifiants invalides" });

    const token = jwt.sign(
      { id: u.id, nom: u.nom, email: u.email, role: u.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
    );
    res.json({
      token,
      user: { id: u.id, nom: u.nom, email: u.email, role: u.role },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/auth/me
router.get("/me", authRequired, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
