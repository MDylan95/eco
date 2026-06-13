import React, { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, RefreshCw, X } from "lucide-react";

/**
 * Bandeau qui invite l'utilisateur à installer Eco Manager comme PWA,
 * et notifie automatiquement quand une nouvelle version est disponible.
 */
export default function PWAPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      console.log("[PWA] Service worker enregistré :", swUrl);
    },
    onRegisterError(err) {
      console.error("[PWA] Erreur d'enregistrement :", err);
    },
  });

  useEffect(() => {
    // Détection iOS (Safari ne supporte pas beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    // Détection mode standalone (déjà installée)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Capture l'événement d'installation (Android / Chrome desktop)
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallEvent(e);
      // Afficher si l'utilisateur n'a pas déjà refusé récemment
      const dismissed = localStorage.getItem("pwa_install_dismissed");
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowInstall(true);
      }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Une fois installée
    window.addEventListener("appinstalled", () => {
      setShowInstall(false);
      setInstallEvent(null);
    });

    // Sur iOS : montrer le message d'aide si pas standalone et pas déjà refusé
    if (ios && !standalone) {
      const dismissed = localStorage.getItem("pwa_install_dismissed");
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowInstall(true);
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
    } else {
      localStorage.setItem("pwa_install_dismissed", String(Date.now()));
      setShowInstall(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem("pwa_install_dismissed", String(Date.now()));
    setShowInstall(false);
  };

  // Bandeau "Mise à jour disponible"
  if (needRefresh) {
    return (
      <div className="pwa-banner update">
        <RefreshCw size={16} />
        <span>Une nouvelle version est disponible.</span>
        <button className="pwa-btn primary" onClick={() => updateServiceWorker(true)}>
          Mettre à jour
        </button>
        <button className="pwa-close" onClick={() => setNeedRefresh(false)} aria-label="Fermer">
          <X size={14} />
        </button>
      </div>
    );
  }

  // Bandeau "Installer l'app"
  if (showInstall && !isStandalone) {
    if (isIos) {
      return (
        <div className="pwa-banner">
          <Download size={16} />
          <span>
            Installez Eco Manager : appuyez sur <strong>Partager</strong>{" "}
            puis <strong>Sur l'écran d'accueil</strong>.
          </span>
          <button className="pwa-close" onClick={dismiss} aria-label="Fermer">
            <X size={14} />
          </button>
        </div>
      );
    }
    return (
      <div className="pwa-banner">
        <Download size={16} />
        <span>Installer Eco Manager sur votre téléphone ?</span>
        <button className="pwa-btn primary" onClick={install}>
          Installer
        </button>
        <button className="pwa-close" onClick={dismiss} aria-label="Plus tard">
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
}
