import React, { useEffect, useState } from "react";
import { Car, Pencil, Trash2, User2, X } from "lucide-react";
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
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);

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
      if (editingVehicle) {
        await api.updateVehicule(editingVehicle.id, {
          immatriculation: imm,
          type: type || null,
        });
        setOk("Véhicule mis à jour.");
      } else {
        await api.createVehicule({ immatriculation: imm, type: type || null });
        setOk("Véhicule ajouté.");
      }
      setVehicleForm(emptyVehicle);
      setEditingVehicle(null);
      await load();
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
      if (editingAgent) {
        await api.updateAgent(editingAgent.id, {
          matricule,
          nom,
          prenom,
          fonction: agentForm.fonction,
        });
        setOk("Agent mis à jour.");
      } else {
        await api.createAgent({
          matricule,
          nom,
          prenom,
          fonction: agentForm.fonction,
        });
        setOk("Agent ajouté.");
      }
      setAgentForm(emptyAgent);
      setEditingAgent(null);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAgent(false);
    }
  };

  const editVehicle = (v) => {
    setEditingVehicle(v);
    setVehicleForm({ immatriculation: v.immatriculation, type: v.type || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm(emptyVehicle);
    setErr("");
  };

  const deleteVehicle = async (id) => {
    if (!confirm("Désactiver ce véhicule ?")) return;
    try {
      setErr("");
      setOk("");
      await api.deleteVehicule(id);
      await load();
      if (editingVehicle?.id === id) {
        setEditingVehicle(null);
        setVehicleForm(emptyVehicle);
      }
      setOk("Véhicule désactivé.");
    } catch (e) {
      setErr(e.message);
    }
  };

  const editAgent = (a, fonction) => {
    setEditingAgent({ ...a, fonction });
    setAgentForm({
      matricule: a.matricule,
      nom: a.nom,
      prenom: a.prenom || "",
      fonction,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditAgent = () => {
    setEditingAgent(null);
    setAgentForm(emptyAgent);
    setErr("");
  };

  const deleteAgent = async (id) => {
    if (!confirm("Désactiver cet agent ?")) return;
    try {
      setErr("");
      setOk("");
      await api.deleteAgent(id);
      await load();
      if (editingAgent?.id === id) {
        setEditingAgent(null);
        setAgentForm(emptyAgent);
      }
      setOk("Agent désactivé.");
    } catch (e) {
      setErr(e.message);
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
        <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>
          {editingVehicle ? "Modifier un véhicule" : "Ajouter un véhicule"}
        </div>
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
              {editingVehicle && (
                <button className="btn ghost" type="button" onClick={cancelEditVehicle} style={{ marginRight: 8 }}>
                  <X size={14} /> Annuler
                </button>
              )}
              <button className="btn" type="submit" disabled={busyVehicle}>
                <Car size={14} />
                {busyVehicle ? "Enregistrement…" : editingVehicle ? "Enregistrer" : "Ajouter véhicule"}
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
                <th>Actions</th>
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
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => editVehicle(v)}
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => deleteVehicle(v.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2" style={{ marginBottom: 22 }}>
        <form className="card" onSubmit={handleAgent}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>
            {editingAgent ? "Modifier un agent" : "Ajouter un chauffeur / éboueur"}
          </div>
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
              {editingAgent && (
                <button className="btn ghost" type="button" onClick={cancelEditAgent} style={{ marginRight: 8 }}>
                  <X size={14} /> Annuler
                </button>
              )}
              <button className="btn" type="submit" disabled={busyAgent}>
                <User2 size={14} />
                {busyAgent ? "Enregistrement…" : editingAgent ? "Enregistrer" : "Ajouter agent"}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chauffeurs.length === 0 && (
                <tr>
                  <td colSpan={4} className="dim" style={{ textAlign: "center", padding: 24 }}>
                    Aucun chauffeur actif.
                  </td>
                </tr>
              )}
              {chauffeurs.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.matricule}</td>
                  <td>{a.nom}</td>
                  <td>{a.prenom || <span className="dim">—</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => editAgent(a, "chauffeur")}
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => deleteAgent(a.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eboueurs.length === 0 && (
                <tr>
                  <td colSpan={4} className="dim" style={{ textAlign: "center", padding: 24 }}>
                    Aucun éboueur actif.
                  </td>
                </tr>
              )}
              {eboueurs.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.matricule}</td>
                  <td>{a.nom}</td>
                  <td>{a.prenom || <span className="dim">—</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => editAgent(a, "eboueur")}
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => deleteAgent(a.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
