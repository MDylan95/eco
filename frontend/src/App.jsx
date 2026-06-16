import React from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { Moon, LogOut } from "lucide-react";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Planification from "./pages/Planification.jsx";
import Production from "./pages/Production.jsx";
import PWAPrompt from "./components/PWAPrompt.jsx";
import { getUser, clearSession } from "./api.js";

function ProtectedLayout({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const user = getUser();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;

  const logout = () => {
    clearSession();
    nav("/login");
  };

  return (
    <div className="app-layout">
      <header className="topbar">
        <Link to="/" className="brand">
          <div className="brand-mark"><Moon size={18} strokeWidth={2.4} /></div>
          <img className="brand-logo" src="/icons/images%20(1).jpeg" alt="Eco Eburnie" />
          <div>
            <div className="brand-name">Eco <em>Manager</em></div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: "0.08em" }}>
              SECTEUR 3 · NUIT
            </div>
          </div>
        </Link>

        <nav className="nav">
          <NavLink to="/" exact>Tableau de bord</NavLink>
          <NavLink to="/planification">Planification</NavLink>
          <NavLink to="/production">Production</NavLink>
        </nav>

        <div className="user-menu">
          <span className="mono user-name">
            {user.nom}
          </span>
          <button className="btn ghost" onClick={logout} title="Se déconnecter">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );
}

function NavLink({ to, children, exact }) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
  return (
    <Link to={to} className={active ? "active" : ""}>
      {children}
    </Link>
  );
}

export default function App() {
  return (
    <>
      <PWAPrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/planification" element={<ProtectedLayout><Planification /></ProtectedLayout>} />
        <Route path="/production" element={<ProtectedLayout><Production /></ProtectedLayout>} />
      </Routes>
    </>
  );
}
