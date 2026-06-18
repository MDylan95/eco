require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const agentsRoutes = require("./routes/agents");
const vehiculesRoutes = require("./routes/vehicules");
const refdataRoutes = require("./routes/refdata");
const planifRoutes = require("./routes/planifications");
const prodRoutes = require("./routes/productions");
const dashRoutes = require("./routes/dashboard");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET est requis dans l'environnement backend.");
}

const app = express();

// CORS : accepte une liste d'origines (CSV) ou * en dev
const corsOriginRaw = process.env.CORS_ORIGIN || "";
const corsOrigins = corsOriginRaw
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const hasWildcardCors = corsOrigins.includes("*");
const inProduction = process.env.NODE_ENV === "production";

if (hasWildcardCors) {
  if (inProduction) {
    throw new Error("CORS_ORIGIN '*' n'est pas autorisé en production. Définissez les origines explicites.");
  }
}

const finalCorsOrigins = hasWildcardCors
  ? true
  : corsOrigins.length > 0
  ? corsOrigins
  : ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"];

if (inProduction && !hasWildcardCors && corsOrigins.length === 0) {
  throw new Error("Mode production : configurez CORS_ORIGIN (ex: https://mon-domaine.vercel.app).");
}

app.use(
  cors({
    origin: finalCorsOrigins,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "eco-manager-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/vehicules", vehiculesRoutes);
app.use("/api", refdataRoutes);
app.use("/api/planifications", planifRoutes);
app.use("/api/productions", prodRoutes);
app.use("/api/dashboard", dashRoutes);

app.use((req, res) => res.status(404).json({ error: "Route inexistante" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🌙 Eco Manager API démarrée sur le port ${PORT}`);
});
