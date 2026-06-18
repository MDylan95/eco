import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Activity, Users, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { api } from "../api.js";

const C = {
  lime: "#5f9f14",
  amber: "#b7791f",
  red: "#d43d3d",
  border: "#d9e2d2",
  text: "#172018",
  textDim: "#5b665d",
  textMute: "#849087",
  panel: "#ffffff",
  elevated: "#eef4e8",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const [date, setDate] = useState(today());
  const [weekDate, setWeekDate] = useState(today());
  const [compareWeekDate, setCompareWeekDate] = useState("");
  const [data, setData] = useState(null);
  const [planif, setPlanif] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (d, weekRef, compareRef) => {
    setLoading(true);
    setErr("");
    try {
      const [dash, planifications] = await Promise.all([
        api.dashboard(d, {
          ...(weekRef ? { week_date: weekRef } : {}),
          ...(compareRef ? { compare_week_date: compareRef } : {}),
        }),
        api.planifications(d),
      ]);
      setData(dash);
      setPlanif(planifications || []);
    } catch (e) {
      setErr(e.message);
      setPlanif([]);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date, weekDate, compareWeekDate);
  }, [date, weekDate, compareWeekDate]);

  if (loading && !data) return <div className="dim">Chargement…</div>;
  if (err) return <div className="error">{err}</div>;
  if (!data) return null;

  const k = data.kpis;
  const planifies = Number(k.equipages_planifies) || 0;
  const clotures = Number(k.equipages_clotures) || 0;
  const coverage = planifies > 0 ? Math.round((clotures / planifies) * 100) : 0;
  const total = Number(k.tonnage_total) || 0;

  const trend = data.tendance_7j.map((t) => ({
    day: new Date(t.jour).toLocaleDateString("fr-FR", { weekday: "short" }),
    tonnage: Number(t.tonnage),
  }));

  const hebdo = data.hebdo || {};
  const semaineCourante = hebdo.semaine_courante || {};
  const semainePrecedente = hebdo.semaine_precedente || {};
  const comparaisonHebdo = hebdo.comparaison || {};
  const chauffeursHebdo = Array.isArray(data.par_chauffeur_hebdo_comparatif)
    ? data.par_chauffeur_hebdo_comparatif
    : Array.isArray(data.par_chauffeur_hebdo)
    ? data.par_chauffeur_hebdo
    : [];

  const semaine = data.semaine;
  const semaineLabel = semaine
    ? `Semaine du ${new Date(`${semaine.debut}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      })}`
    : "7 derniers jours";

  const formatDelta = (value) => {
    const n = Number(value || 0);
    return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
  };

  const formatPct = (value) => {
    if (value === null || value === undefined) return "—";
    return `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
  };

  const parCircuit = data.par_circuit.map((c) => ({
    name: c.circuit,
    tonnage: Number(c.tonnage),
    commune: c.commune,
  }));

  const parCommuneMax = data.par_commune.reduce((acc, row) => {
    const value = Number(row.tonnage);
    return value > acc ? value : acc;
  }, 0) || 1;

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
            style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}
          >
            Vue d&apos;ensemble ·{" "}
            {new Date(date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(28px, 5vw, 46px)", margin: 0, fontWeight: 400 }}>
            Tournée de nuit, <em style={{ color: C.lime }}>en direct</em>
          </h1>
        </div>
        <div className="filter-grid" style={{ display: "grid", gap: 10, gridTemplateColumns: "auto auto auto", alignItems: "end" }}>
          <label
            style={{
              display: "grid",
              gap: 4,
              fontSize: 11,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Date journée
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "auto" }}
            />
          </label>
          <label
            style={{
              display: "grid",
              gap: 4,
              fontSize: 11,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Semaine de référence
            <input
              type="date"
              className="input"
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
              style={{ width: "auto" }}
            />
          </label>
          <label
            style={{
              display: "grid",
              gap: 4,
              fontSize: 11,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Comparer avec (optionnel)
            <input
              type="date"
              className="input"
              value={compareWeekDate}
              onChange={(e) => setCompareWeekDate(e.target.value)}
              style={{ width: "auto" }}
            />
          </label>
        </div>
      </section>

      <section className="kpi-grid">
        <Kpi
          label="Tonnage collecté"
          value={total.toFixed(1)}
          unit="t"
          sub={`${clotures} circuits clôturés`}
          highlight
          icon={<TrendingUp size={16} />}
        />
        <Kpi
          label="Couverture"
          value={coverage}
          unit="%"
          sub={`${clotures} / ${planifies}`}
          icon={<Activity size={16} />}
        />
        <Kpi
          label="Équipages"
          value={planifies}
          unit=""
          sub={`${planifies * 4} agents`}
          icon={<Users size={16} />}
        />
        <Kpi
          label="Tonnage hebdo"
          value={(semaineCourante.tonnage_hebdo || 0).toFixed(1)}
          unit="t"
          sub={`Semaine du ${semaineCourante.titre || "—"}`}
          icon={<TrendingUp size={16} />}
        />
        <Kpi
          label="Voyages hebdo"
          value={Number(semaineCourante.voyages || 0)}
          unit=""
          sub={`${semainePrecedente.voyages || 0} la semaine précédente`}
          icon={<Users size={16} />}
        />
        <Kpi
          label="Comparatif hebdo"
          value={formatDelta(comparaisonHebdo.tonnage_delta || 0)}
          unit="t"
          sub={`${formatPct(comparaisonHebdo.tonnage_pct)} tonnage`}
          icon={<Activity size={16} />}
        />
        <Kpi
          label="Évolution voyages"
          value={formatDelta(comparaisonHebdo.voyages_delta || 0)}
          unit=""
          sub={`${formatPct(comparaisonHebdo.voyages_pct)} voyages`}
          icon={<Activity size={16} />}
        />
        <Kpi
          label="En attente"
          value={planifies - clotures}
          unit=""
          sub="tonnages non saisis"
          icon={<AlertTriangle size={16} />}
        />
      </section>

      <section className="grid-2">
        <div className="card">
          <Header title="Évolution du tonnage" sub="7 dernières nuits" />
          <div style={{ height: 240, marginTop: 12 }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.lime} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.lime} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} tickLine={false} unit=" t" />
                <Tooltip
                  contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: C.textDim }}
                />
                <Area type="monotone" dataKey="tonnage" stroke={C.lime} strokeWidth={2} fill="url(#g1)" dot={{ fill: C.lime, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <Header title="Par commune" sub="Tonnage du jour" />
          <div style={{ marginTop: 18 }}>
            {data.par_commune.length === 0 ? (
              <div className="dim" style={{ fontSize: 13 }}>
                Aucune donnée pour ce jour.
              </div>
            ) : (
              data.par_commune.map((c, i) => {
                const pct = (Number(c.tonnage) / parCommuneMax) * 100;
                const colors = [C.lime, "#9bc232", "#6e8f24", "#4d6418"];
                return (
                  <div key={c.commune} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        fontSize: 13,
                      }}
                    >
                      <span>{c.commune}</span>
                      <span className="mono">
                        {Number(c.tonnage).toFixed(1)} <span style={{ color: C.textMute }}>t</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: C.elevated, borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: colors[i] || C.lime,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 22 }}>
        <Header title="Tonnage par circuit" sub="Détail du soir" />
        <div style={{ height: 280, marginTop: 12 }}>
          <ResponsiveContainer>
            <BarChart data={parCircuit} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} tickLine={false} unit=" t" />
              <Tooltip
                contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: C.textDim }}
              />
              <Bar dataKey="tonnage" fill={C.lime} radius={[4, 4, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 22 }}>
        <Header
          title="Performances hebdomadaires par chauffeur"
          sub={
            compareWeekDate
              ? `${semaineLabel} (comparatif manuel)`
              : `${semaineLabel} (comparatif auto semaine précédente)`
          }
        />
        <div className="dim" style={{ fontSize: 12, marginTop: 10 }}>
          Semaine courante : {semaineCourante.debut || "—"} → {semaineCourante.fin || "—"} ·
          {` comparée à ${semainePrecedente.debut || "—"} → ${semainePrecedente.fin || "—"} (${semainePrecedente.voyages || 0} voyages)`}
        </div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Chauffeur</th>
                <th>Ton. sem. courante</th>
                <th>Voyages</th>
                <th>Ton. sem. préc.</th>
                <th>Voyages préc.</th>
                <th>Delta tonnage</th>
              </tr>
            </thead>
            <tbody>
              {chauffeursHebdo.length === 0 && (
                <tr>
                  <td colSpan={6} className="dim" style={{ textAlign: "center", padding: 24 }}>
                    Aucune production hebdomadaire enregistrée.
                  </td>
                </tr>
              )}
              {chauffeursHebdo.map((c) => (
                <tr key={c.chauffeur_id}>
                  <td>{c.matricule} · {c.nom} {c.prenom}</td>
                  <td className="mono">
                    {Number(c.tonnage_hebdo).toFixed(1)} <span style={{ color: C.textMute }}>t</span>
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {c.voyages}
                  </td>
                  <td className="mono">
                    {Number(c.tonnage_precedent || 0).toFixed(1)} <span style={{ color: C.textMute }}>t</span>
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {Number(c.voyages_precedent || 0)}
                  </td>
                  <td className="mono" style={{ color: c.delta_tonnage >= 0 ? C.lime : C.red }}>
                    {formatDelta(c.delta_tonnage)} t
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <Header title="Planification du jour" sub={`${clotures}/${planifies} clôturés`} />
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Circ.</th>
                <th>Commune</th>
                <th>Chauffeur</th>
                <th className="col-hide-mobile">Éboueurs</th>
                <th className="col-hide-mobile">Véhicule</th>
                <th style={{ textAlign: "right" }}>Tonnage</th>
                <th style={{ textAlign: "right" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {planif.length === 0 && (
                <tr>
                  <td colSpan={7} className="dim" style={{ textAlign: "center", padding: 24 }}>
                    Aucune planification pour cette date.
                  </td>
                </tr>
              )}
              {planif.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="mono" style={{ color: C.lime }}>
                      {p.circuit_code}
                    </span>
                  </td>
                  <td>{p.commune}</td>
                  <td>
                    {p.chauffeur_matricule} · {p.chauffeur_nom} {p.chauffeur_prenom}
                  </td>
                  <td className="col-hide-mobile" style={{ fontSize: 12 }}>
                    {p.eboueur1_matricule} · {p.eboueur1_nom} {p.eboueur1_prenom}
                    {` · ${p.eboueur2_matricule} · ${p.eboueur2_nom} ${p.eboueur2_prenom}`}
                    {p.eboueur3_matricule ? ` · ${p.eboueur3_matricule} · ${p.eboueur3_nom} ${p.eboueur3_prenom}` : ""}
                  </td>
                  <td className="mono col-hide-mobile" style={{ color: C.textDim }}>
                    {p.vehicule_immat}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {p.tonnage != null ? (
                      <>
                        {Number(p.tonnage).toFixed(1)} <span style={{ color: C.textMute }}>t</span>
                      </>
                    ) : (
                      <span style={{ color: C.amber }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {p.statut === "done" ? (
                      <span className="pill done">
                        <CheckCircle2 size={12} /> Clôturé
                      </span>
                    ) : (
                      <span className="pill pending">
                        <Clock size={12} /> En attente
                      </span>
                    )}
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

function Kpi({ label, value, unit, sub, highlight, icon }) {
  return (
    <div className={"kpi" + (highlight ? " highlight" : "")}>
      <div className="kpi-label">
        <span>{label}</span>
        <span style={{ color: highlight ? C.lime : C.textDim }}>{icon}</span>
      </div>
      <div>
        <span className="serif kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function Header({ title, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div className="serif" style={{ fontSize: 18 }}>
          {title}
        </div>
        {sub && <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
