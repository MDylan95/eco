import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { api } from "../api.js";

const today = () => new Date().toISOString().slice(0, 10);

export default function Production() {
  const [date, setDate] = useState(today());
  const [planif, setPlanif] = useState([]);
  const [inputs, setInputs] = useState({});
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    setErr("");
    try {
      const p = await api.planifications(date);
      setPlanif(p);
      const init = {};
      p.forEach(x => { if (x.tonnage != null) init[x.id] = x.tonnage; });
      setInputs(init);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, [date]);

  const save = async (id) => {
    setErr(""); setOk("");
    const t = inputs[id];
    if (t === "" || t == null || isNaN(Number(t))) {
      setErr("Tonnage invalide");
      return;
    }
    try {
      await api.saveProduction(id, Number(t));
      setOk("Tonnage enregistré");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div>
          <div className="dim mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Étape 2 · Centre de transfert
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: 0, fontWeight: 400 }}>
            Saisie du tonnage
          </h1>
        </div>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
      </section>

      {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}
      {ok && <div className="success" style={{ marginBottom: 14 }}>{ok}</div>}

      <section className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Circ.</th>
                <th>Commune</th>
                <th>Chauffeur</th>
                <th className="col-hide-mobile">Véhicule</th>
                <th style={{ width: 140 }}>Tonnage (t)</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {planif.length === 0 && (
                <tr><td colSpan={6} className="dim" style={{ textAlign: "center", padding: 24 }}>
                  Aucun équipage à saisir.
                </td></tr>
              )}
              {planif.map(p => (
                <tr key={p.id}>
                  <td><span className="mono" style={{ color: "var(--lime)" }}>{p.circuit_code}</span></td>
                  <td>{p.commune}</td>
                  <td>{p.chauffeur_nom}</td>
                  <td className="mono col-hide-mobile" style={{ color: "var(--text-dim)" }}>{p.vehicule_immat}</td>
                  <td>
                    <input
                      className="input mono"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      value={inputs[p.id] ?? ""}
                      onChange={e => setInputs(s => ({ ...s, [p.id]: e.target.value }))}
                      style={{ padding: "6px 10px" }}
                    />
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {p.statut === "done" && (
                      <span className="pill done" style={{ marginRight: 8 }}>
                        <CheckCircle2 size={12} />
                      </span>
                    )}
                    <button className="btn" onClick={() => save(p.id)}>
                      {p.statut === "done" ? "Modifier" : "Enregistrer"}
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
