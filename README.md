# Income Manager — Gestion Budgétaire Familiale

Application web **self-hostée** de gestion budgétaire familiale. Interface néo-futuriste, multi-utilisateurs, bilingue FR/EN.

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react) ![Stack](https://img.shields.io/badge/Node.js-Fastify-000000?style=flat&logo=fastify) ![Stack](https://img.shields.io/badge/SQLite-@libsql-003B57?style=flat&logo=sqlite) ![Stack](https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker)

---

## Fonctionnalités

| Page | Description |
|------|-------------|
| **Tableau de bord** | KPIs, 4 graphiques interactifs, transactions récentes |
| **Revenus** | CRUD avec saisie fiche de paie (brut / net / cotisations) |
| **Dépenses** | CRUD avec catégories colorées et icônes |
| **Récurrents** | Règles de transactions automatiques (cron horaire) |
| **Objectifs d'épargne** | Barre de progression, contributions manuelles ou récurrentes |
| **Prévisions** | Simulateur d'intérêts composés, scénarios sauvegardables |
| **Paramètres** | Gestion des membres du foyer, langue FR/EN, export JSON |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Fastify 4 + TypeScript + Drizzle ORM |
| Base de données | SQLite via `@libsql/client` (aucune dépendance native) |
| Auth | JWT (access 15 min + refresh 7 jours) |
| Déploiement | Docker Compose + nginx |

---

## Installation

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré
- Git (pour cloner le repo)

> **Pas de Docker ?** Voir la section [Installation sans Docker](#installation-sans-docker) plus bas.

---

### 🐳 Installation avec Docker (recommandée)

**1. Cloner le dépôt**

```bash
git clone https://github.com/Oxbaxer/Income-Manager.git
cd Income-Manager
```

**2. Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Ouvrez le fichier `.env` et renseignez les deux clés secrètes (chaînes aléatoires d'au moins 32 caractères) :

```env
JWT_SECRET=remplacez_par_une_chaine_aleatoire_longue
JWT_REFRESH_SECRET=remplacez_par_une_autre_chaine_aleatoire
```

> **Astuce** : générez des clés sécurisées avec `openssl rand -hex 32` (Linux/Mac) ou `[System.Web.Security.Membership]::GeneratePassword(32, 0)` (PowerShell).

**3. Lancer l'application**

```bash
docker compose up -d
```

Docker va télécharger les images, construire et démarrer les deux conteneurs (backend + frontend nginx). La première fois peut prendre 2–3 minutes.

**4. Ouvrir l'application**

Rendez-vous sur **http://localhost** dans votre navigateur.

**5. Créer votre foyer**

Au premier lancement, cliquez sur **"Créer un foyer"**, renseignez votre nom, email et mot de passe. Vous devenez automatiquement administrateur.

---

### Commandes Docker utiles

```bash
# Vérifier que les conteneurs tournent
docker compose ps

# Voir les logs en temps réel
docker compose logs -f

# Arrêter l'application
docker compose down

# Mettre à jour après un git pull
docker compose down
docker compose up -d --build

# Sauvegarder la base de données
cp data/income-manager.db data/income-manager.db.backup
```

---

### Installation sans Docker

**Prérequis** : Node.js 20+

**1. Cloner et installer les dépendances**

```bash
git clone https://github.com/Oxbaxer/Income-Manager.git
cd Income-Manager

npm run install:all   # installe backend + frontend en une commande
```

**2. Configurer l'environnement backend**

```bash
cp .env.example .env
# Éditez .env et renseignez JWT_SECRET et JWT_REFRESH_SECRET
```

**3. Lancer (une seule commande)**

```bash
npm run dev
```

Backend (`:3001`) et frontend (`:5173`) démarrent simultanément dans le même terminal.

Ouvrez **http://localhost:5173** dans votre navigateur.

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `JWT_SECRET` | Clé de signature des tokens d'accès | — **(obligatoire)** |
| `JWT_REFRESH_SECRET` | Clé de signature des tokens de refresh | — **(obligatoire)** |
| `PORT` | Port du backend | `3001` |
| `DATABASE_PATH` | Chemin du fichier SQLite | `./data/income-manager.db` |
| `NODE_ENV` | Environnement (`development` / `production`) | `development` |

---

## Structure du projet

```
Income-Manager/
├── backend/
│   ├── src/
│   │   ├── db/           # Schéma Drizzle, migrations, client SQLite
│   │   ├── routes/       # auth, income, expenses, analytics,
│   │   │                 # recurring, goals, projections, export
│   │   ├── services/     # cron.ts — exécution des règles récurrentes
│   │   └── middleware/   # authenticate, requireAdmin
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, Income, Expenses, Recurring,
│   │   │                 # Goals, Projections, Settings
│   │   ├── components/   # Sidebar, PageShell, charts, ui
│   │   ├── stores/       # auth (Zustand)
│   │   ├── api/          # client fetch avec auto-refresh JWT
│   │   └── i18n/         # fr, en
│   ├── Dockerfile
│   └── nginx.conf
├── docs/
│   └── documentation.html  # Documentation utilisateur complète
├── docker-compose.yml
└── .env.example
```

---

## Gestion des utilisateurs

L'administrateur du foyer peut, depuis **Paramètres → Membres du foyer** :

- **Inviter** un nouveau membre (nom, email, mot de passe, rôle)
- **Promouvoir** un membre en administrateur (↑)
- **Rétrograder** un administrateur en membre (↓)
- **Supprimer** un membre (✕)

> Le dernier administrateur ne peut pas être rétrogradé ni supprimé.

---

## Documentation

Une documentation complète (installation + guide d'utilisation pas-à-pas) est disponible dans [`docs/documentation.html`](docs/documentation.html).  
Ouvrez ce fichier dans un navigateur et utilisez **Fichier → Imprimer → Enregistrer en PDF** pour obtenir la version PDF.

---

## Licence

MIT
