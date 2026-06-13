import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { api } from "../api.js";

const today = () => new Date().toISOString().slice(0, 10);

export default function Planification() {
  const [date, setDate] = useState(today());
  const [communes, setCommunes] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [eboueurs, setEboueurs] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [planif, setPlanif] = useState([]);

  const [form, setForm] = useState({
    commune_id: "",
    circuit_id: "",
    chauffeur_id: "",
    eboueur1_id: "",
    eboueur2_id: "",
    vehicule_id: "",
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    const [c, ch, eb, v, p] = await Promise.all([
      api.communes(),
      api.agents("chauffeur"),
      api.agents("eboueur"),
      api.vehicules(),
      api.planifications(date),
    ]);
    setCommunes(c);
    setChauffeurs(ch);
    setEboueurs(eb);
    setVehicules(v);
    setPlanif(p);
  };

  useEffect(() => { loadAll().catch(e => setErr(e.message)); }, [date]);

  const circuitsForCommune = useMemo(() => {
    const c = communes.find(x => String(x.id) === String(form.commune_id));
    return c ? c.circuits : [];
  }, [form.commune_id, communes]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v, ...(k === "commune_id" ? { circuit_id: "" } : {}) }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      await api.createPlanification({
        date_planification: date,
        circuit_id: Number(form.circuit_id),
        chauffeur_id: Number(form.chauffeur_id),
        eboueur1_id: Number(form.eboueur1_id),
        eboueur2_id: Number(form.eboueur2_id),
        vehicule_id: Number(form.vehicule_id),
      });
      setOk("Équipage planifié");
      setForm({ commune_id: "", circuit_id: "", chauffeur_id: "", eboueur1_id: "", eboueur2_id: "", vehicule_id: "" });
      await loadAll();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Supprimer cette planification ?")) return;
    try {
      await api.deletePlanification(id);
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div>
          <div className="dim mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Étape 1 · Affectation des équipages
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: 0, fontWeight: 400 }}>
            Planification
          </h1>
        </div>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
      </section>

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Nouvel équipage</div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label className="label">Commune</label>
              <select className="select" required value={form.commune_id} onChange={e => set("commune_id", e.target.value)}>
                <option value="">— Choisir —</option>
                {communes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Circuit</label>
              <select className="select" required value={form.circuit_id} onChange={e => set("circuit_id", e.target.value)} disabled={!form.commune_id}>
                <option value="">— Choisir —</option>
                {circuitsForCommune.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Chauffeur</label>
              <select className="select" required value={form.chauffeur_id} onChange={e => set("chauffeur_id", e.target.value)}>
                <option value="">— Choisir —</option>
                {chauffeurs.map(a => <option key={a.id} value={a.id}>{a.matricule} · {a.nom} {a.prenom}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Véhicule</label>
              <select className="select" required value={form.vehicule_id} onChange={e => set("vehicule_id", e.target.value)}>
                <option value="">— Choisir —</option>
                {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Éboueur 1</label>
              <select className="select" required value={form.eboueur1_id} onChange={e => set("eboueur1_id", e.target.value)}>
                <option value="">— Choisir —</option>
                {eboueurs.filter(a => String(a.id) !== form.eboueur2_id).map(a => (
                  <option key={a.id} value={a.id}>{a.matricule} · {a.nom} {a.prenom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Éboueur 2</label>
              <select className="select" required value={form.eboueur2_id} onChange={e => set("eboueur2_id", e.target.value)}>
                <option value="">— Choisir —</option>
                {eboueurs.filter(a => String(a.id) !== form.eboueur1_id).map(a => (
                  <option key={a.id} value={a.id}>{a.matricule} · {a.nom} {a.prenom}</option>
                ))}
              </select>
            </div>
          </div>

          {err && <div className="error" style={{ marginTop: 14 }}>{err}</div>}
          {ok && <div className="success" style={{ marginTop: 14 }}><CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> {ok}</div>}

          <div style={{ marginTop: 16 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer l'équipage"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Équipages du jour ({planif.length})</div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Circ.</th>
                <th>Commune</th>
                <th>Chauffeur</th>
                <th className="col-hide-mobile">Éboueurs</th>
                <th className="col-hide-mobile">Véhicule</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {planif.length === 0 && (
                <tr><td colSpan={6} className="dim" style={{ textAlign: "center", padding: 24 }}>
                  Aucun équipage planifié.
                </td></tr>
              )}
              {planif.map(p => (
                <tr key={p.id}>
                  <td><span className="mono" style={{ color: "var(--lime)" }}>{p.circuit_code}</span></td>
                  <td>{p.commune}</td>
                  <td>{p.chauffeur_nom} {p.chauffeur_prenom}</td>
                  <td className="col-hide-mobile" style={{ fontSize: 12 }}>
                    {p.eboueur1_nom} · {p.eboueur2_nom}
                  </td>
                  <td className="mono col-hide-mobile" style={{ color: "var(--text-dim)" }}>{p.vehicule_immat}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn danger" onClick={() => remove(p.id)} title="Supprimer">
                      <Trash2 size={14} />
                    </button>
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
