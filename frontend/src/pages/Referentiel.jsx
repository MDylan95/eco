import React, { useEffect, useState } from "react";
import { Car, User2 } from "lucide-react";
import { api, getUser } from "../api.js";

const emptyVehicle = { immatriculation: "", type: "" };

const emptyAgent = {
  matricule: "",
  nom: "",
  prenom: "",
  fonction: "chauffeur",
};

export default function Referentiel() {
  const [vehicules, setVehicules] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [eboueurs, setEboueurs] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [agentForm, setAgentForm] = useState(emptyAgent);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busyVehicle, setBusyVehicle] = useState(false);
  const [busyAgent, setBusyAgent] = useState(false);

  const user = getUser();

  const load = async () => {
    const [v, ch, eb] = await Promise.all([
      api.vehicules(),
      api.agents("chauffeur"),
      api.agents("eboueur"),
    ]);
    setVehicules(v);
    setChauffeurs(ch);
    setEboueurs(eb);
  };

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  if (!user || user.role !== "admin") {
    return (
      <section className="card">
        <div className="serif" style={{ fontSize: 20 }}>Accès réservé</div>
        <p className="dim" style={{ marginTop: 8 }}>
          Cette page est réservée à l&apos;administrateur.
        </p>
      </section>
    );
  }

  const handleVehicle = async (ev) => {
    ev.preventDefault();
    setErr("");
    setOk("");
    const imm = vehicleForm.immatriculation.trim().toUpperCase();
    const type = vehicleForm.type.trim();
    if (!imm) {
      setErr("L&apos;immatriculation est obligatoire.");
      return;
    }

    setBusyVehicle(true);
    try {
      await api.createVehicule({ immatriculation: imm, type: type || null });
      setVehicleForm(emptyVehicle);
      await load();
      setOk("Véhicule ajouté.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyVehicle(false);
    }
  };

  const handleAgent = async (ev) => {
    ev.preventDefault();
    setErr("");
    setOk("");
    const matricule = agentForm.matricule.trim().toUpperCase();
    const nom = agentForm.nom.trim().toUpperCase();
    const prenom = agentForm.prenom.trim();
    if (!matricule || !nom || !agentForm.fonction) {
      setErr("Matricule, nom et fonction sont obligatoires.");
      return;
    }

    setBusyAgent(true);
    try {
      await api.createAgent({
        matricule,
        nom,
        prenom,
        fonction: agentForm.fonction,
      });
      setAgentForm(emptyAgent);
      await load();
      setOk("Agent ajouté.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAgent(false);
    }
  };

  return (
    <>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div>
          <div className="dim mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Table de pilotage · Administration
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: 0, fontWeight: 400 }}>
            Référentiel
          </h1>
        </div>
      </section>

      {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}
      {ok && <div className="success" style={{ marginBottom: 14 }}>{ok}</div>}

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Ajouter un véhicule</div>
        <form onSubmit={handleVehicle}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="label">Immatriculation</label>
              <input
                className="input"
                placeholder="CI-1234-AB"
                value={vehicleForm.immatriculation}
                onChange={(e) => setVehicleForm((s) => ({ ...s, immatriculation: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Type (optionnel)</label>
              <input
                className="input"
                placeholder="Benne 12T"
                value={vehicleForm.type}
                onChange={(e) => setVehicleForm((s) => ({ ...s, type: e.target.value }))}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" type="submit" disabled={busyVehicle}>
                <Car size={14} />
                {busyVehicle ? "Enregistrement…" : "Ajouter véhicule"}
              </button>
            </div>
          </div>
        </form>

        <div style={{ marginTop: 20, overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Immatriculation</th>
                <th>Type</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {vehicules.length === 0 && (
                <tr>
                  <td colSpan={3} className="dim" style={{ textAlign: "center", padding: 24 }}>
                    Aucun véhicule actif.
                  </td>
                </tr>
              )}
              {vehicules.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.immatriculation}</td>
                  <td>{v.type || <span className="dim">—</span>}</td>
                  <td><span className="pill">Actif</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2" style={{ marginBottom: 22 }}>
        <form className="card" onSubmit={handleAgent}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Ajouter un chauffeur / éboueur</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label className="label">Fonction</label>
              <select
                className="select"
                value={agentForm.fonction}
                onChange={(e) => setAgentForm((s) => ({ ...s, fonction: e.target.value }))}
              >
                <option value="chauffeur">Chauffeur</option>
                <option value="eboueur">Éboueur</option>
              </select>
            </div>
            <div>
              <label className="label">Matricule</label>
              <input
                className="input"
                placeholder="M001 ou E001"
                value={agentForm.matricule}
                onChange={(e) => setAgentForm((s) => ({ ...s, matricule: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Nom</label>
              <input
                className="input"
                value={agentForm.nom}
                onChange={(e) => setAgentForm((s) => ({ ...s, nom: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input
                className="input"
                value={agentForm.prenom}
                onChange={(e) => setAgentForm((s) => ({ ...s, prenom: e.target.value }))}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" type="submit" disabled={busyAgent}>
                <User2 size={14} />
                {busyAgent ? "Enregistrement…" : "Ajouter agent"}
              </button>
            </div>
          </div>
        </form>

        <div className="card">
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Chauffeurs actifs</div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                </tr>
              </thead>
              <tbody>
                {chauffeurs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="dim" style={{ textAlign: "center", padding: 24 }}>
                      Aucun chauffeur actif.
                    </td>
                  </tr>
                )}
                {chauffeurs.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.matricule}</td>
                    <td>{a.nom}</td>
                    <td>{a.prenom || <span className="dim">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Éboueurs actifs</div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénom</th>
              </tr>
            </thead>
            <tbody>
              {eboueurs.length === 0 && (
                <tr>
                  <td colSpan={3} className="dim" style={{ textAlign: "center", padding: 24 }}>
                    Aucun éboueur actif.
                  </td>
                </tr>
              )}
              {eboueurs.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.matricule}</td>
                  <td>{a.nom}</td>
                  <td>{a.prenom || <span className="dim">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
