import React, { useEffect, useState } from "react";
import { Car, Pencil, Trash2, User2, MapPin, X } from "lucide-react";
import { api, getUser } from "../api.js";

const emptyVehicle = { immatriculation: "", type: "" };

const emptyAgent = {
  matricule: "",
  nom: "",
  prenom: "",
  fonction: "chauffeur",
};

const emptyCommune = { nom: "" };

const emptyCircuit = { code: "", commune_id: "", actif: true };

export default function Referentiel() {
  const [vehicules, setVehicules] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [eboueurs, setEboueurs] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [circuits, setCircuits] = useState([]);

  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [agentForm, setAgentForm] = useState(emptyAgent);
  const [communeForm, setCommuneForm] = useState(emptyCommune);
  const [circuitForm, setCircuitForm] = useState(emptyCircuit);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busyVehicle, setBusyVehicle] = useState(false);
  const [busyAgent, setBusyAgent] = useState(false);
  const [busyCommune, setBusyCommune] = useState(false);
  const [busyCircuit, setBusyCircuit] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [editingCommune, setEditingCommune] = useState(null);
  const [editingCircuit, setEditingCircuit] = useState(null);

  const user = getUser();

  const load = async () => {
    const [v, ch, eb, communesData, circuitsData] = await Promise.all([
      api.vehicules(),
      api.agents("chauffeur"),
      api.agents("eboueur"),
      api.communes(),
      api.circuits(),
    ]);
    setVehicules(v);
    setChauffeurs(ch);
    setEboueurs(eb);
    setCommunes(communesData);
    setCircuits(circuitsData);
  };

  const refresh = async () => {
    try {
      setErr("");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
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

  const resetMessages = () => {
    setErr("");
    setOk("");
  };

  const handleVehicle = async (ev) => {
    ev.preventDefault();
    resetMessages();
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
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyVehicle(false);
    }
  };

  const handleAgent = async (ev) => {
    ev.preventDefault();
    resetMessages();
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
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAgent(false);
    }
  };

  const handleCommune = async (ev) => {
    ev.preventDefault();
    resetMessages();
    const nom = communeForm.nom.trim().toUpperCase();
    if (!nom) {
      setErr("Le nom de la commune est obligatoire.");
      return;
    }

    setBusyCommune(true);
    try {
      if (editingCommune) {
        await api.updateCommune(editingCommune.id, nom);
        setOk("Commune mise à jour.");
      } else {
        await api.createCommune(nom);
        setOk("Commune ajoutée.");
      }
      setCommuneForm(emptyCommune);
      setEditingCommune(null);
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyCommune(false);
    }
  };

  const handleCircuit = async (ev) => {
    ev.preventDefault();
    resetMessages();
    const code = circuitForm.code.trim().toUpperCase();
    const communeId = Number(circuitForm.commune_id);
    const actif = circuitForm.actif;

    if (!code || !Number.isInteger(communeId) || communeId <= 0) {
      setErr("Code et commune sont obligatoires.");
      return;
    }

    setBusyCircuit(true);
    try {
      if (editingCircuit) {
        await api.updateCircuit(editingCircuit.id, {
          code,
          commune_id: communeId,
          actif,
        });
        setOk("Circuit mis à jour.");
      } else {
        await api.createCircuit({ code, commune_id: communeId });
        setOk("Circuit ajouté.");
      }
      setCircuitForm(emptyCircuit);
      setEditingCircuit(null);
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyCircuit(false);
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
  };

  const deleteVehicle = async (id) => {
    if (!confirm("Désactiver ce véhicule ?")) return;
    try {
      resetMessages();
      await api.deleteVehicule(id);
      await refresh();
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
  };

  const deleteAgent = async (id) => {
    if (!confirm("Désactiver cet agent ?")) return;
    try {
      resetMessages();
      await api.deleteAgent(id);
      await refresh();
      if (editingAgent?.id === id) {
        setEditingAgent(null);
        setAgentForm(emptyAgent);
      }
      setOk("Agent désactivé.");
    } catch (e) {
      setErr(e.message);
    }
  };

  const editCommune = (commune) => {
    setEditingCommune(commune);
    setCommuneForm({ nom: commune.nom });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditCommune = () => {
    setEditingCommune(null);
    setCommuneForm(emptyCommune);
  };

  const deleteCommune = async (id) => {
    if (!confirm("Supprimer cette commune ?")) return;
    try {
      resetMessages();
      await api.deleteCommune(id);
      await refresh();
      if (editingCommune?.id === id) {
        setEditingCommune(null);
        setCommuneForm(emptyCommune);
      }
      setOk("Commune supprimée.");
    } catch (e) {
      setErr(e.message);
    }
  };

  const editCircuit = (circuit) => {
    setEditingCircuit(circuit);
    setCircuitForm({
      code: circuit.code,
      commune_id: String(circuit.commune_id),
      actif: circuit.actif === false ? false : true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditCircuit = () => {
    setEditingCircuit(null);
    setCircuitForm(emptyCircuit);
  };

  const deleteCircuit = async (id) => {
    if (!confirm("Désactiver ce circuit ?")) return;
    try {
      resetMessages();
      await api.deleteCircuit(id);
      await refresh();
      if (editingCircuit?.id === id) {
        setEditingCircuit(null);
        setCircuitForm(emptyCircuit);
      }
      setOk("Circuit désactivé.");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div>
          <div
            className="dim mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Table de pilotage · Administration
          </div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              margin: 0,
              fontWeight: 400,
            }}
          >
            Référentiel
          </h1>
        </div>
      </section>

      {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}
      {ok && <div className="success" style={{ marginBottom: 14 }}>{ok}</div>}

      <section className="grid-2" style={{ marginBottom: 22 }}>
        <form className="card" onSubmit={handleVehicle}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>
            {editingVehicle ? "Modifier un véhicule" : "Ajouter un véhicule"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
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
                <button
                  className="btn ghost"
                  type="button"
                  onClick={cancelEditVehicle}
                  style={{ marginRight: 8 }}
                >
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

        <form className="card" onSubmit={handleAgent}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>
            {editingAgent ? "Modifier un agent" : "Ajouter un chauffeur / éboueur"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
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
                <button
                  className="btn ghost"
                  type="button"
                  onClick={cancelEditAgent}
                  style={{ marginRight: 8 }}
                >
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
      </section>

      <section className="grid-2" style={{ marginBottom: 22 }}>
        <form className="card" onSubmit={handleCommune}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={18} />
            {editingCommune ? "Modifier une commune" : "Ajouter une commune"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 14 }}>
            <div>
              <label className="label">Nom</label>
              <input
                className="input"
                placeholder="Port-Bouët"
                value={communeForm.nom}
                onChange={(e) => setCommuneForm((s) => ({ ...s, nom: e.target.value }))}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              {editingCommune && (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={cancelEditCommune}
                  style={{ marginRight: 8 }}
                >
                  <X size={14} /> Annuler
                </button>
              )}
              <button className="btn" type="submit" disabled={busyCommune}>
                {busyCommune ? "Enregistrement…" : editingCommune ? "Enregistrer" : "Ajouter commune"}
              </button>
            </div>
          </div>
        </form>

        <form className="card" onSubmit={handleCircuit}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Ajouter / modifier un circuit</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 180px",
              gap: 14,
              alignItems: "end",
            }}
          >
            <div>
              <label className="label">Code circuit</label>
              <input
                className="input"
                placeholder="101"
                value={circuitForm.code}
                onChange={(e) => setCircuitForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <label className="label">Commune</label>
              <select
                className="select"
                value={circuitForm.commune_id}
                onChange={(e) => setCircuitForm((s) => ({ ...s, commune_id: e.target.value }))}
              >
                <option value="">— Choisir —</option>
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label className="label" style={{ marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={circuitForm.actif}
                  onChange={(e) => setCircuitForm((s) => ({ ...s, actif: e.target.checked }))}
                  style={{ marginRight: 8 }}
                />
                Actif
              </label>
              <button className="btn" type="submit" disabled={busyCircuit} style={{ marginLeft: "auto" }}>
                {busyCircuit ? "Enregistrement…" : editingCircuit ? "Enregistrer" : "Ajouter circuit"}
              </button>
            </div>
          </div>
          {editingCircuit && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={cancelEditCircuit}
              >
                <X size={14} /> Annuler édition
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Véhicules actifs</div>
        <div style={{ overflowX: "auto" }}>
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

        <div className="card">
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
        </div>
      </section>

      <section className="grid-2" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Communes</div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Commune</th>
                  <th>Circuits actifs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {communes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="dim" style={{ textAlign: "center", padding: 24 }}>
                      Aucune commune active.
                    </td>
                  </tr>
                )}
                {communes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nom}</td>
                    <td>
                      {c.circuits?.length ? c.circuits.map((ci) => ci.code).join(", ") : <span className="dim">—</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => editCommune(c)}
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => deleteCommune(c.id)}
                          title="Supprimer"
                          disabled={c.circuits?.length > 0}
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

        <div className="card">
          <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Circuits actifs</div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Commune</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {circuits.length === 0 && (
                  <tr>
                    <td colSpan={3} className="dim" style={{ textAlign: "center", padding: 24 }}>
                      Aucun circuit actif.
                    </td>
                  </tr>
                )}
                {circuits.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.code}</td>
                    <td>{c.commune}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => editCircuit(c)}
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => deleteCircuit(c.id)}
                          title="Désactiver"
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
    </>
  );
}
