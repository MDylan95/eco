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

const app = express();

// CORS : accepte une liste d'origines (CSV) ou * en dev
const corsOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: corsOrigins.includes("*") ? true : corsOrigins,
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
