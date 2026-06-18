# 🌙 Eco Manager

Plateforme de suivi de la collecte de nuit — **Secteur 3 d'Abidjan**
(Port-Bouët, Koumassi, Marcory, Treichville · 8 circuits)

## Stack

- **Frontend** : React 18 + Vite + Recharts + PWA (installable mobile)
- **Backend** : Node.js 20+ + Express
- **Base de données** : PostgreSQL 16
- **Auth** : JWT

## 🌐 Déploiement en ligne (URL publique pour téléphones)

Voir **[DEPLOYMENT.md](./DEPLOYMENT.md)** pour le guide complet pas-à-pas (Neon + Render + Vercel, 20 minutes, gratuit).

## Prérequis (développement local)

- Node.js **20** (via `.nvmrc`) ([nodejs.org](https://nodejs.org))
- Docker Desktop (pour la base de données) — alternative : PostgreSQL installé en local

---

## 🚀 Démarrage rapide (5 minutes)

### 1. Lancer la base de données

```bash
docker compose up -d
```

Cela démarre PostgreSQL sur `localhost:5433` (user `eco`, password `ecopass`, db `ecomanager`) avec la configuration actuelle du `docker-compose.yml` (`5433:5432`).

> Sans Docker ? Installez PostgreSQL localement et créez la base manuellement avec ces credentials, puis adaptez `backend/.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:init     # crée les tables
npm run db:seed     # insère les données (communes, circuits, agents, véhicules, comptes test)
npm run dev         # démarre l'API sur http://localhost:4000
```

> Mise à jour d'une base existante ? Exécutez `npm run db:setup` pour appliquer la migration (colonne véhicule/éboueur 3).

### 3. Frontend

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev         # démarre l'app sur http://localhost:5173
```

Ouvrez **http://localhost:5173** dans le navigateur (PC ou mobile sur le même réseau).

### 4. Comptes de test

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | `admin@ecomanager.ci` | `admin123` |
| Superviseur | `superviseur@ecomanager.ci` | `super123` |

> En production, les comptes initiaux sont lus depuis les variables `ADMIN_INIT_PASSWORD` et `SUPERVISEUR_INIT_PASSWORD`.  
> Conservez des secrets forts dans vos environnements.

---

## 📂 Structure

```
eco-manager/
├── docker-compose.yml          # PostgreSQL local
├── backend/
│   ├── sql/01_schema.sql       # Schéma SQL complet
│   ├── src/
│   │   ├── server.js           # Entrée Express
│   │   ├── db.js               # Connexion PG
│   │   ├── middleware/auth.js  # JWT
│   │   ├── routes/             # auth, agents, vehicules, refdata,
│   │   │                       #  planifications, productions, dashboard
│   │   └── scripts/            # initDb.js, seed.js
│   └── package.json
└── frontend/
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js              # Client API + auth
        ├── styles.css          # Thème dark + responsive
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Planification.jsx   # Étape 1
            └── Production.jsx      # Étape 2
```

---

## 🛣️ Routes API

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion (retourne JWT) |
| GET  | `/api/auth/me` | Utilisateur courant |
| GET  | `/api/communes` | Communes + leurs circuits |
| GET  | `/api/circuits?commune_id=` | Circuits (filtrés) |
| GET  | `/api/agents?fonction=chauffeur\|eboueur` | Personnel |
| POST | `/api/agents` | Créer un agent (admin) |
| GET  | `/api/vehicules` | Véhicules |
| POST | `/api/vehicules` | Créer un véhicule (admin) |
| GET  | `/api/planifications?date=YYYY-MM-DD` | Équipages du jour |
| POST | `/api/planifications` | **Étape 1** : créer un équipage |
| DELETE | `/api/planifications/:id` | Supprimer |
| POST | `/api/productions` | **Étape 2** : saisir le tonnage |
| GET  | `/api/dashboard?date=YYYY-MM-DD` | KPI + agrégats |

Toutes les routes (sauf `/api/auth/login`) exigent un header `Authorization: Bearer <token>`.

---

## 📱 Installation sur téléphone (PWA)

Eco Manager est une **PWA** (Progressive Web App) : installable comme une vraie app, avec icône sur l'écran d'accueil, mode plein écran, et résilience hors-ligne basique.

### Pour tester en local depuis un téléphone

Les PWA exigent **HTTPS** sauf sur `localhost`. Pour tester depuis un téléphone sur le même Wi-Fi :

1. Trouvez l'IP locale de votre PC (ex. `192.168.1.42`)
2. Sur le téléphone, ouvrez `http://192.168.1.42:5173`
3. **iOS Safari** exige HTTPS pour activer le service worker. En dev, utilisez un tunnel comme `cloudflared` :

```bash
cloudflared tunnel --url http://localhost:5173
# → vous obtenez une URL https://xxx.trycloudflare.com
```

### En production

Une fois déployé en HTTPS, l'app affichera automatiquement un bandeau **"Installer Eco Manager"** :

- **Android / Chrome** : un bouton "Installer" apparaît
- **iOS / Safari** : message d'aide pour utiliser **Partager → Sur l'écran d'accueil**

Une fois installée, l'icône Eco Manager apparaît sur l'écran d'accueil et l'app se lance en plein écran (sans la barre d'adresse).

### Fonctionnement hors-ligne

- Les **assets statiques** (HTML, JS, CSS, polices, icônes) sont mis en cache au premier chargement
- L'**API** utilise une stratégie "network-first" avec fallback cache (5 secondes de timeout) : l'app continue de fonctionner en lecture si la connexion est mauvaise
- Une **mise à jour automatique** s'enclenche quand une nouvelle version est déployée — un bandeau invite à recharger

### Raccourcis (long-press sur l'icône, Android)

- 📊 Tableau de bord
- 📝 Planification
- ⚖️ Saisie tonnage

---

## 🔒 Règles métier appliquées

- 1 équipage = 1 chauffeur + 3 éboueurs (distincts) + 1 véhicule + 1 circuit
- Un circuit ne peut être planifié qu'**une seule fois** par nuit
- Un chauffeur / véhicule / éboueur ne peut être affecté qu'**à un seul circuit** par nuit
- Une planification = **un seul tonnage** (une rotation par nuit)
- Le tonnage est saisi par le superviseur après déchargement au centre de transfert

---

## 🧭 Étapes suivantes suggérées

- [ ] Gestion fine des absences avec écran dédié
- [ ] Export Excel / PDF des rapports
- [ ] PWA (installable sur mobile, mode hors-ligne)
- [ ] Notifications push (tonnage non saisi après 03:00)
- [ ] Tableau de bord administrateur (gestion agents / véhicules dans l'UI)
- [ ] Authentification à 2 facteurs

---

## 🆘 Dépannage

**`ECONNREFUSED` au démarrage du backend** → la base de données n'est pas lancée. Vérifiez `docker compose ps`.

**`relation "users" does not exist`** → vous n'avez pas exécuté `npm run db:init`.

**Login impossible / "Identifiants invalides"** → vous n'avez pas exécuté `npm run db:seed`.

**CORS error dans le navigateur** → vérifiez que `CORS_ORIGIN` dans `backend/.env` correspond à l'URL du frontend.

---

**Eco Manager v0.1** · Prototype fonctionnel · Mai 2026
## ⚠️  Sécurité

- `npm run db:init` détruit/réinstalle le schéma si exécuté sur une base existante.  
  En production, cette commande n'est autorisée qu'avec `FORCE_DB_INIT=true`.
- En production, définissez explicitement `CORS_ORIGIN` avec le(s) vrai(s) domaine(s) front.
