# Plan — Income Manager (Application de Gestion Budgétaire Familiale)
Date : 2026-05-07

## Choix techniques retenus

| Couche | Choix | Justification |
|--------|-------|---------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts | Vite pour la rapidité dev, Recharts pour les graphiques financiers interactifs |
| Backend | Node.js + Fastify + TypeScript | Même langue front/back, Fastify ~3x plus rapide qu'Express, TypeScript natif |
| BDD | SQLite + Drizzle ORM | Foyer = faible volume, zéro infra séparée, fichier `.db` trivial à sauvegarder |
| Auth | JWT (access + refresh tokens) + bcrypt | Standard robuste, stateless |
| i18n | i18next (FR + EN) | Standard React, lazy-loading des namespaces |
| State | Zustand | Léger, TypeScript-friendly, pas de boilerplate |
| Cron | node-cron | Transactions récurrentes, intégré au backend |
| Deploy | Docker + docker-compose | Lancement en une commande |

## Décisions fonctionnelles

- **PDF paie** : saisie manuelle structurée uniquement (brut, net, cotisations, primes)
- **Multi-utilisateur** : admin + membres avec permissions limitées
- **Récurrentes** : génération automatique via cron job
- **Langue** : i18n FR + EN dès le départ
- **Devise** : Euro (€) uniquement
- **Objectifs** : contributions manuelles + option épargne récurrente auto
- **Import** : depuis export de cette appli uniquement (JSON)

---

## Architecture BDD (SQLite)

```sql
households          -- foyer
  id, name, created_at

users               -- membres du foyer
  id, household_id, email, password_hash, name
  role: 'admin' | 'member'
  locale: 'fr' | 'en'
  created_at

income_categories   -- Salaire, Loyer perçu, Dons, Remboursements, Autres
  id, household_id, name, is_default, sort_order

expense_categories  -- Repas, Sorties, Voyages... (extensible)
  id, household_id, name, parent_id, is_default, icon, color, sort_order

income_transactions
  id, household_id, user_id, amount, date, category_id
  description, notes, is_payslip, created_at, updated_at

payslip_details     -- détails fiche de paie (1:1 avec income_transaction)
  id, transaction_id, gross_amount, net_amount
  contributions, bonuses, employer_name, period_label

expense_transactions
  id, household_id, user_id, amount, date, category_id
  description, notes, recurring_id, created_at, updated_at

recurring_rules     -- règle de récurrence (revenus ou dépenses)
  id, household_id, user_id, type: 'income' | 'expense'
  amount, category_id, description
  frequency: 'weekly' | 'monthly' | 'yearly'
  start_date, end_date (nullable), next_due_date, is_active

savings_goals
  id, household_id, name, target_amount, current_amount
  target_date, created_at, updated_at

savings_contributions
  id, goal_id, user_id, amount, date, note
  is_recurring, frequency (nullable), next_due_date (nullable)

projection_scenarios
  id, household_id, name, initial_amount
  monthly_contribution, annual_rate_percent
  start_date, duration_years, created_at
```

---

## Structure des dossiers

```
income-manager/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.ts               -- point d'entrée Fastify
│       ├── config.ts              -- variables d'env
│       ├── db/
│       │   ├── schema.ts          -- Drizzle schema
│       │   ├── client.ts          -- connexion SQLite
│       │   └── migrations/
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── users.ts
│       │   ├── income.ts
│       │   ├── expenses.ts
│       │   ├── recurring.ts
│       │   ├── goals.ts
│       │   ├── projections.ts
│       │   └── export.ts
│       ├── handlers/              -- logique par route
│       ├── services/              -- logique métier réutilisable
│       │   ├── auth.service.ts
│       │   ├── analytics.service.ts
│       │   ├── projection.service.ts
│       │   └── export.service.ts
│       ├── middleware/
│       │   ├── authenticate.ts    -- vérification JWT
│       │   └── authorize.ts       -- vérification rôle
│       ├── cron/
│       │   └── recurring.cron.ts  -- génération transactions récurrentes
│       └── types/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                   -- client fetch typé
│       ├── stores/                -- Zustand stores
│       ├── hooks/                 -- custom hooks
│       ├── i18n/
│       │   ├── fr/
│       │   └── en/
│       ├── types/
│       ├── components/
│       │   ├── ui/                -- design system (Button, Card, Modal...)
│       │   ├── charts/            -- graphiques Recharts wrappés
│       │   ├── forms/             -- formulaires transaction, objectif...
│       │   └── layout/            -- Sidebar, TopBar, PageShell
│       └── pages/
│           ├── Dashboard.tsx
│           ├── Income.tsx
│           ├── Expenses.tsx
│           ├── Goals.tsx
│           ├── Projections.tsx
│           └── Settings.tsx
│
└── data/                          -- volume Docker SQLite
```

---

## Endpoints API

### Auth
```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Users (admin requis pour créer/supprimer)
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Revenus
```
GET    /api/income?page=&limit=&category=&from=&to=
POST   /api/income
PUT    /api/income/:id
DELETE /api/income/:id
GET    /api/income/categories
POST   /api/income/categories
PUT    /api/income/categories/:id
DELETE /api/income/categories/:id
```

### Dépenses
```
GET    /api/expenses?page=&limit=&category=&from=&to=
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id
GET    /api/expenses/categories
POST   /api/expenses/categories
PUT    /api/expenses/categories/:id
DELETE /api/expenses/categories/:id
```

### Récurrentes
```
GET    /api/recurring
POST   /api/recurring
PUT    /api/recurring/:id
DELETE /api/recurring/:id
```

### Analytics (dashboard + graphiques)
```
GET    /api/analytics/summary?period=1m|6m|1y|2y|5y|all
GET    /api/analytics/savings-evolution?period=
GET    /api/analytics/expenses-by-category?period=
GET    /api/analytics/income-cumulative?period=
GET    /api/analytics/income-vs-expenses?period=
```

### Objectifs
```
GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id
POST   /api/goals/:id/contribute
GET    /api/goals/:id/recurring
POST   /api/goals/:id/recurring
PUT    /api/goals/:id/recurring/:ruleId
DELETE /api/goals/:id/recurring/:ruleId
```

### Prévisions
```
GET    /api/projections
POST   /api/projections
PUT    /api/projections/:id
DELETE /api/projections/:id
GET    /api/projections/:id/compute   -- calcul points courbe
```

### Export / Import
```
GET    /api/export                    -- JSON complet
POST   /api/import                    -- JSON complet
```

---

## Wireframes textuels

### Dashboard
```
┌──────────────────────────────────────────────────────────┐
│ ◆ Income Manager              [FR|EN]  [👤 Prénom]  [⚙️] │
├────────────┬─────────────────────────────────────────────┤
│            │  ┌──────────────┐ ┌──────────────┐          │
│ Dashboard  │  │  Revenus     │ │  Dépenses    │          │
│ Revenus    │  │  €3 200      │ │  €1 840      │          │
│ Dépenses   │  └──────────────┘ └──────────────┘          │
│ Objectifs  │  ┌──────────────┐                           │
│ Prévisions │  │  Épargne nette│                          │
│ Paramètres │  │  €1 360      │                           │
│            │  └──────────────┘                           │
│            │                                             │
│            │  [Revenus vs Dépenses — 6 derniers mois]    │
│            │  [Graphique barres Recharts]                 │
│            │                                             │
│            │  Transactions récentes         [Voir tout →]│
│            │  01/05  Salaire mai      +€2 400  Salaire   │
│            │  01/05  Courses           −€124   Repas     │
│            │  30/04  Netflix           −€17    Abonnement│
└────────────┴─────────────────────────────────────────────┘
```

### Revenus / Dépenses
```
┌──────────────────────────────────────────────────────────┐
│ Revenus                [+ Ajouter]  [Période ▼] [Export] │
├──────────────────────────────────────────────────────────┤
│ [🔍 Rechercher...]          Total période : €3 200       │
├──────────────────────────────────────────────────────────┤
│ Date       Catégorie    Description       Montant  Actions│
│ 01/05/26   Salaire      Salaire mai       +€2 400  ✏️ 🗑️ │
│ 01/05/26   Loyer perçu  Appt. B           +€800   ✏️ 🗑️ │
│ 15/04/26   Don          Remboursement     +€0     ✏️ 🗑️ │
│                                     [← 1 2 3 ... →]     │
└──────────────────────────────────────────────────────────┘
```

### Objectifs d'épargne
```
┌──────────────────────────────────────────────────────────┐
│ Objectifs d'épargne                  [+ Nouvel objectif] │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐  ┌────────────────────────┐   │
│ │ 🏠 Apport immobilier  │  │ ✈️ Voyage Japon        │   │
│ │ €8 200 / €30 000      │  │ €1 200 / €3 000        │   │
│ │ ████████░░░░░░░ 27%   │  │ ████████████░░░ 40%    │   │
│ │ Manque : €21 800      │  │ Manque : €1 800        │   │
│ │ → €482/mois requis    │  │ → €180/mois requis     │   │
│ │ Objectif : déc. 2028  │  │ Objectif : août 2026   │   │
│ │ [Contribuer] [⚙️]     │  │ [Contribuer] [⚙️]     │   │
│ └────────────────────────┘  └────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Prévisions
```
┌──────────────────────────────────────────────────────────┐
│ Prévisions d'épargne              [+ Nouveau scénario]   │
├──────────────────────────────────────────────────────────┤
│ Scénarios actifs :                                       │
│ ● Conservateur (2%)  ● Modéré (5%)  ● Optimiste (8%)    │
│                                                          │
│  [Graphique ligne Recharts — projection 1/5/10/20 ans]   │
│                                                          │
│ Capital initial : €10 000    Apport mensuel : €500       │
│ Horizon : [1 an ▼]                                       │
│                                                          │
│ Résultats à 10 ans :                                     │
│ Conservateur : €87 500   Modéré : €101 000              │
│ Optimiste    : €118 000  (dont intérêts composés : …)   │
└──────────────────────────────────────────────────────────┘
```

---

## Phases de développement

### Phase 1 — MVP (auth + CRUD + dashboard)
- [ ] Setup monorepo + Docker + Fastify + Drizzle + SQLite
- [ ] Schema BDD + migrations initiales
- [ ] Auth : register (admin), login, refresh, logout, middleware JWT, rôles
- [ ] CRUD revenus + catégories (dont saisie fiche de paie)
- [ ] CRUD dépenses + catégories extensibles
- [ ] Analytics de base : summary du mois
- [ ] Dashboard : 3 KPI cards + graphique revenus vs dépenses + liste récente
- [ ] Design system : tokens, Button, Card, Modal, Input, Table
- [ ] i18n : structure FR + EN (namespaces vides remplis au fil du dev)

### Phase 2 — Visualisations
- [ ] Sélecteur de période (1m / 6m / 1y / 2y / 5y / tout)
- [ ] Graphique : évolution épargne disponible
- [ ] Graphique : dépenses avec répartition par catégorie (pie + bar)
- [ ] Graphique : revenus nets cumulés
- [ ] Graphique : revenus bruts cumulés
- [ ] Graphique : revenus vs dépenses (comparatif)

### Phase 3 — Récurrentes + Objectifs
- [ ] Modèle recurring_rules + cron job quotidien
- [ ] UI gestion transactions récurrentes
- [ ] Module objectifs : CRUD + barre de progression + calcul mensuel requis
- [ ] Contributions manuelles + contributions récurrentes auto

### Phase 4 — Prévisions + Export
- [ ] Service calcul intérêts composés
- [ ] Scénarios multiples + graphique prévisionnel
- [ ] Export JSON complet
- [ ] Import JSON (validation + merge)

### Phase 5 — Polish
- [ ] Design néo-futuriste complet (glassmorphism, gradients, animations)
- [ ] Responsive mobile / tablette
- [ ] Mode clair optionnel
- [ ] Tests unitaires : calculs financiers (projections, épargne requise, résumés)
- [ ] README Docker complet + guide utilisateur

---

## Dépendances principales

### Backend
```json
{
  "fastify": "^4",
  "@fastify/jwt": "^8",
  "@fastify/cors": "^9",
  "drizzle-orm": "latest",
  "better-sqlite3": "latest",
  "bcrypt": "^5",
  "node-cron": "^3",
  "zod": "^3"
}
```

### Frontend
```json
{
  "react": "^18",
  "react-router-dom": "^6",
  "recharts": "^2",
  "zustand": "^4",
  "i18next": "^23",
  "react-i18next": "^13",
  "react-hook-form": "^7",
  "@hookform/resolvers": "^3",
  "zod": "^3",
  "date-fns": "^3",
  "tailwindcss": "^3"
}
```
