# Income Manager — Gestion Budgétaire Familiale

Application web self-hostée de gestion budgétaire familiale. Interface néo-futuriste, multi-utilisateurs, bilingue FR/EN.

## Fonctionnalités

- **Revenus** — CRUD avec saisie fiche de paie (brut/net/cotisations)
- **Dépenses** — CRUD avec catégories colorées et icônes
- **Transactions récurrentes** — règles avec exécution automatique horaire (cron)
- **Tableau de bord** — KPIs, 4 graphiques interactifs, transactions récentes
- **Objectifs d'épargne** — CRUD, barre de progression, contributions manuelles ou récurrentes
- **Prévisions** — simulateur interactif d'intérêts composés, scénarios sauvegardables
- **Export JSON** — export complet des données du foyer
- **Multi-utilisateurs** — admin + membres par foyer
- **i18n** — Français / English

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Fastify 4 + TypeScript + Drizzle ORM |
| Base de données | SQLite via `@libsql/client` (aucune dépendance native) |
| Auth | JWT (access 15min + refresh 7j) |
| Déploiement | Docker Compose + nginx |

## Démarrage rapide (Docker)

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Éditer .env : renseigner JWT_SECRET et JWT_REFRESH_SECRET
#    (chaînes aléatoires de 32+ caractères)
nano .env

# 3. Lancer
docker compose up -d

# L'application est disponible sur http://localhost
```

## Développement local

**Prérequis** : Node.js 20+

```bash
# Installer les dépendances
cd backend && npm install
cd ../frontend && npm install

# Lancer (dans deux terminaux séparés)
cd backend && npm run dev     # API sur http://localhost:3001
cd frontend && npm run dev    # UI  sur http://localhost:5173
```

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `JWT_SECRET` | Clé de signature des tokens d'accès | — (obligatoire) |
| `JWT_REFRESH_SECRET` | Clé de signature des tokens de refresh | — (obligatoire) |
| `PORT` | Port du backend | `3001` |
| `DATABASE_PATH` | Chemin du fichier SQLite | `./data/income-manager.db` |
| `NODE_ENV` | Environnement | `development` |

## Structure du projet

```
Income Manager/
├── backend/
│   ├── src/
│   │   ├── db/           # Schema Drizzle, migrations, client SQLite
│   │   ├── routes/       # auth, income, expenses, analytics,
│   │   │                 # recurring, goals, projections, export
│   │   ├── services/     # cron.ts — exécution des règles récurrentes
│   │   └── middleware/   # authenticate, requireAdmin
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, Income, Expenses, Recurring,
│   │   │                 # Goals, Projections, Settings
│   │   ├── components/   # layout (Sidebar, PageShell), ui, charts
│   │   ├── stores/       # auth (Zustand)
│   │   ├── api/          # client fetch avec auto-refresh JWT
│   │   └── i18n/         # fr, en
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```

## Premier lancement

1. Accédez à l'application
2. Cliquez **Créer un foyer** et renseignez vos informations
3. Les catégories par défaut sont créées automatiquement
4. Commencez à saisir vos revenus et dépenses
