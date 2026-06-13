import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon } from "lucide-react";
import { api, setSession } from "../api.js";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("superviseur@ecomanager.ci");
  const [password, setPassword] = useState("super123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      setSession(token, user);
      nav("/");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div className="brand-mark"><Moon size={20} strokeWidth={2.4} /></div>
          <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: "0.1em" }}>
            SECTEUR 3 · ABIDJAN
          </div>
        </div>
        <h1 className="login-title">Eco <em>Manager</em></h1>
        <p className="login-sub">Connectez-vous pour piloter la collecte de nuit.</p>

        <form onSubmit={submit}>
          <div className="form-row">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-row">
            <label className="label">Mot de passe</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

          <button
            className="btn"
            type="submit"
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
            disabled={loading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 11, color: "var(--text-mute)", textAlign: "center" }} className="mono">
          superviseur@ecomanager.ci / super123
        </div>
      </div>
    </div>
  );
}
