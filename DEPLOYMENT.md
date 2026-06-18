# 🚀 Guide de déploiement Eco Manager

Déploiement gratuit en 3 services : **Neon** (base) + **Render** (backend) + **Vercel** (frontend).

À la fin, vous aurez une URL `https://eco-manager.vercel.app` (ou similaire) installable comme PWA sur n'importe quel téléphone.

⏱️ **Temps estimé : 20 minutes.**

---

## Prérequis

Créez ces 4 comptes (gratuits, connectables avec GitHub) :

1. **GitHub** : https://github.com/signup
2. **Neon** : https://neon.tech (base PostgreSQL)
3. **Render** : https://render.com (backend)
4. **Vercel** : https://vercel.com (frontend)

---

## Étape 1 — Mettre le code sur GitHub (5 min)

Sur votre PC, dans le dossier `eco-manager` :

```bash
git init
git add .
git commit -m "Initial commit"
```

Puis sur GitHub :
1. Cliquez **"New repository"** → nom : `eco-manager` → **Private** ou Public → **Create**
2. GitHub vous donne 2 lignes à copier. Exécutez-les dans votre terminal, par exemple :

```bash
git remote add origin https://github.com/VOTRE-NOM/eco-manager.git
git branch -M main
git push -u origin main
```

✅ Votre code est sur GitHub.

---

## Étape 2 — Créer la base PostgreSQL sur Neon (3 min)

1. Allez sur https://neon.tech → **Sign up**
2. **Create Project** :
   - Nom : `eco-manager`
   - PostgreSQL version : 16
   - Region : `Europe (Frankfurt)` (plus proche de la Côte d'Ivoire)
3. Une fois créé, Neon affiche **Connection string**. Cliquez sur **Show password** puis copiez l'URL complète. Elle ressemble à :

```
postgresql://eco_owner:AbCdEf123@ep-frosty-cloud-xxx.eu-central-1.aws.neon.tech/eco-manager?sslmode=require
```

🔖 **Conservez cette URL** — vous en aurez besoin à l'étape 3.

---

## Étape 3 — Déployer le backend sur Render (5 min)

1. Allez sur https://render.com → **Sign up with GitHub**
2. Cliquez **"New +"** → **"Web Service"**
3. Connectez votre dépôt GitHub `eco-manager` → **Connect**
4. Remplissez :
   - **Name** : `eco-manager-api`
   - **Region** : `Frankfurt`
   - **Branch** : `main`
   - **Root Directory** : `backend`
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run db:setup`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free`

5. **Environment Variables** (cliquez "Advanced" puis "Add Environment Variable") :

| Key | Value |
|---|---|
| `DATABASE_URL` | (collez l'URL Neon de l'étape 2) |
| `JWT_SECRET` | (n'importe quelle chaîne aléatoire, ex. `eco-manager-secret-2026-XYZ`) |
| `JWT_EXPIRES_IN` | `12h` |
| `ADMIN_INIT_PASSWORD` | (mot de passe initial admin, ex. `Admin#2026`) |
| `SUPERVISEUR_INIT_PASSWORD` | (mot de passe initial superviseur, ex. `Super#2026`) |
| `CORS_ORIGIN` | (URL Vercel exacte, ex: `https://eco-manager-xxx.vercel.app`) |
| `NODE_VERSION` | `20` |

6. Cliquez **"Create Web Service"**.

Render lance le build (~3 min). Dans les logs, vous devez voir :

```
📦 Création du schéma...
✅ Schéma créé.
🌱 Insertion des données initiales...
✅ Initialisation complète.
🌙 Eco Manager API démarrée sur le port 10000
```

Une fois "Live", notez l'URL en haut : `https://eco-manager-api.onrender.com` (ou similaire).

**Test rapide** : ouvrez `https://eco-manager-api.onrender.com/api/health` dans votre navigateur — vous devez voir `{"ok":true,"service":"eco-manager-api"}`.

🔖 **Conservez cette URL backend.**

---

## Étape 4 — Déployer le frontend sur Vercel (4 min)

1. Allez sur https://vercel.com → **Sign up with GitHub**
2. Cliquez **"Add New..."** → **"Project"**
3. Importez votre dépôt `eco-manager`
4. **Configure Project** :
   - **Framework Preset** : Vite (auto-détecté)
   - **Root Directory** : cliquez **Edit** → choisissez `frontend`
   - **Build Command** : `npm run build` (par défaut)
   - **Output Directory** : `dist` (par défaut)

5. **Environment Variables** (déroulez la section) :

| Name | Value |
|---|---|
| `VITE_API_URL` | (l'URL backend de l'étape 3, ex. `https://eco-manager-api.onrender.com`) |

6. Cliquez **"Deploy"**.

> À ce stade, si votre frontend n'est pas encore connu, vous pouvez redéployer ensuite avec la valeur exacte de `CORS_ORIGIN` et la bonne URL Vercel.

Vercel build (~1 min). Une fois terminé, vous obtenez votre URL : `https://eco-manager-xxx.vercel.app`.

🔖 **C'est votre URL Eco Manager.**

---

## Étape 5 — Verrouiller le CORS (1 min)

Revenez sur Render :
1. Votre service `eco-manager-api` → **Environment** (menu de gauche)
2. Modifiez la variable `CORS_ORIGIN` :
   - Avant : `*`
   - Après : `https://eco-manager-xxx.vercel.app` (votre URL Vercel exacte)
3. **Save Changes** → Render redémarre le service automatiquement.

Cela évite que n'importe quel site puisse appeler votre API.

---

## Étape 6 — Installer la PWA sur votre téléphone (1 min)

1. Sur votre téléphone, ouvrez votre URL Vercel : `https://eco-manager-xxx.vercel.app`
2. Connectez-vous :
   - `superviseur@ecomanager.ci`
   - `super123`

3. **Installation** :
   - **Android (Chrome)** : un bandeau "Installer Eco Manager" apparaît → tapez **Installer**. Sinon, menu ⋮ → **Installer l'application**.
   - **iOS (Safari)** : bouton **Partager** (carré avec flèche vers le haut) → faites défiler → **Sur l'écran d'accueil** → **Ajouter**.

✨ L'icône lune verte est sur votre écran d'accueil. L'app se lance en plein écran.

---

## ⚠️ À savoir sur le plan gratuit Render

Le backend gratuit **s'endort après 15 minutes sans activité**. Au premier appel après veille, comptez **~30 secondes** pour le réveil.

Concrètement : si un superviseur ouvre l'app et qu'elle "rame" 30 s au démarrage, c'est normal. Les appels suivants sont instantanés.

**Solutions** quand vous serez prêt à payer :
- Render Starter à **7 $/mois** → backend toujours actif, démarrage instantané
- Ou utilisez un service de "ping" gratuit comme [UptimeRobot](https://uptimerobot.com) pour réveiller le backend toutes les 5 min

---

## Mettre à jour l'app plus tard

Quand vous modifiez le code :

```bash
git add .
git commit -m "Description du changement"
git push
```

Render et Vercel détectent le push automatiquement et redéploient. La PWA sur votre téléphone affiche un bandeau **"Mise à jour disponible"** que vous tapez pour recharger.

---

## En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| Frontend affiche "Failed to fetch" | Backend endormi ou URL `VITE_API_URL` erronée | Ouvrez `/api/health` du backend dans le navigateur, vérifiez la variable Vercel |
| Login renvoie "Identifiants invalides" | Seed pas exécuté | Allez sur Render → service → **Manual Deploy** → **Clear build cache & deploy** |
| Erreur CORS dans la console | `CORS_ORIGIN` ne correspond pas à l'URL Vercel | Sur Render, ajustez la variable et redéployez |
| PWA ne s'installe pas sur iOS | Service worker en cours de chargement initial | Rafraîchissez 1-2 fois la page, attendez 10 s, réessayez |

---

🌙 **Bon déploiement !** Une fois en ligne, partagez l'URL avec vos superviseurs — ils installent en 5 secondes.
