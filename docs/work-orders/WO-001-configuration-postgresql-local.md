# WO-001 - Configuration PostgreSQL locale

## Statut

Propose

## Contexte

Le projet Eco Manager dispose deja d'un schema PostgreSQL, de scripts d'initialisation et d'un fichier `docker-compose.yml`, mais la base de donnees locale n'est pas encore configuree. Cette configuration est necessaire avant de valider l'authentification, les regles metier, les ecrans de planification, la saisie du tonnage et le tableau de bord.

## Objectif

Mettre en place une base PostgreSQL locale, reproductible et conforme a la documentation du projet, en utilisant Docker uniquement pour la base de donnees.

## Perimetre

Inclus :

- Demarrage d'un conteneur PostgreSQL 16 local via Docker Compose.
- Creation du fichier `backend/.env` a partir de `backend/.env.example`.
- Installation des dependances backend si necessaire.
- Initialisation du schema SQL.
- Insertion des donnees de reference et comptes de test.
- Validation de la connexion backend/base.
- Tests de fumee API.

Exclu :

- Deploiement production Neon/Render/Vercel.
- Dockerisation du backend et du frontend.
- Migration vers un outil de migrations versionnees.
- Creation d'ecrans d'administration.
- Durcissement complet securite production.

## Environnement cible

- Environnement : local developpement
- Base : PostgreSQL 16
- Mode d'execution : Docker Compose
- Port local : `5432`
- Nom base : `ecomanager`
- Utilisateur : `eco`
- Mot de passe : `ecopass`
- Backend local : `http://localhost:4000`
- Frontend local : `http://localhost:5173`

## Prerequis

- Docker disponible et demarre.
- Node.js 18 ou superieur.
- Acces au repertoire projet `eco-manager`.
- Ports `5432`, `4000` et `5173` disponibles.

## Plan d'execution

1. Verifier la disponibilite de Docker.

   ```bash
   docker --version
   docker compose version
   ```

2. Demarrer PostgreSQL.

   ```bash
   docker compose up -d
   ```

3. Verifier l'etat du conteneur.

   ```bash
   docker compose ps
   ```

4. Creer la configuration backend locale.

   ```bash
   cd backend
   cp .env.example .env
   ```

5. Installer les dependances backend.

   ```bash
   npm install
   ```

6. Initialiser le schema.

   ```bash
   npm run db:init
   ```

7. Inserer les donnees initiales.

   ```bash
   npm run db:seed
   ```

8. Lancer le backend.

   ```bash
   npm run dev
   ```

9. Tester l'API de sante.

   ```bash
   curl http://localhost:4000/api/health
   ```

10. Tester l'authentification superviseur.

    ```bash
    curl -X POST http://localhost:4000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"superviseur@ecomanager.ci","password":"super123"}'
    ```

11. Installer et lancer le frontend.

    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

12. Valider dans le navigateur.

    - Ouvrir `http://localhost:5173`.
    - Se connecter avec `superviseur@ecomanager.ci / super123`.
    - Verifier l'acces au tableau de bord.
    - Verifier que les communes et circuits sont charges dans la page Planification.

## Criteres d'acceptation

Le work order est accepte si :

- Le conteneur PostgreSQL est actif.
- Le backend demarre sans erreur de connexion a la base.
- L'endpoint `/api/health` repond avec `ok: true`.
- Le login superviseur fonctionne.
- Les donnees de reference existent :
  - 4 communes : Port-Bouet, Koumassi, Marcory, Treichville.
  - 8 circuits : 101, 102, 104, 106, 107, 108, 109, 110.
  - 1 centre de transfert : Akouedo.
  - agents chauffeurs et eboueurs de test.
  - vehicules de test.
- Le frontend peut appeler l'API via le proxy Vite.

## Risques et mitigations

- Port `5432` deja utilise :
  - verifier les services PostgreSQL locaux existants ;
  - changer le port expose dans `docker-compose.yml` si necessaire.

- Base deja initialisee avec un etat incoherent :
  - analyser l'etat avant suppression ;
  - ne pas supprimer le volume Docker sans validation explicite.

- Dependances npm absentes :
  - executer `npm install` dans `backend` et `frontend`.

- CORS en local :
  - verifier que `backend/.env` contient `CORS_ORIGIN=http://localhost:5173`.

## Rollback

Rollback non destructif :

```bash
docker compose stop
```

Rollback destructif uniquement apres validation explicite :

```bash
docker compose down -v
```

## Livrables

- PostgreSQL local operationnel.
- `backend/.env` configure.
- Schema et donnees initiales charges.
- Backend valide contre la base.
- Frontend capable de consommer l'API locale.

## Prochaine etape apres acceptation

WO-002 - Durcissement des validations backend :

- verifier les fonctions reelles des agents soumis ;
- verifier les ressources actives ;
- ameliorer les erreurs de validation ;
- durcir la saisie du tonnage.
