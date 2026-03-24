# System Patterns: 家庭资产负债表

## Architecture Overview

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with Sidebar
│   ├── page.tsx                  # Dashboard (overview)
│   ├── globals.css               # Tailwind styles
│   ├── assets/page.tsx           # Asset management page
│   ├── liabilities/page.tsx      # Liability management page
│   ├── transactions/page.tsx     # Transaction list page
│   ├── reconciliations/page.tsx  # Reconciliation page
│   ├── statistics/page.tsx       # Statistics & prediction page
│   └── api/                      # API routes (backend)
│       ├── categories/route.ts   # CRUD for categories
│       ├── assets/route.ts       # CRUD for assets
│       ├── liabilities/route.ts  # CRUD for liabilities
│       ├── transactions/route.ts # CRUD for transactions
│       ├── reconciliations/route.ts # Reconciliation logic
│       └── statistics/
│           ├── monthly/route.ts  # Monthly stats & snapshots
│           ├── prediction/route.ts # Cash flow prediction
│           └── snapshot/route.ts # Dashboard overview data
├── components/
│   ├── Sidebar.tsx               # Navigation sidebar
│   └── Forms.tsx                 # AssetForm, LiabilityForm, TransactionForm
├── lib/
│   └── utils.ts                  # Format helpers (money, date, type labels)
└── db/
    ├── schema.ts                 # Drizzle schema (6 tables)
    ├── index.ts                  # Database client
    ├── migrate.ts                # Migration runner
    └── migrations/               # Auto-generated SQL migrations

miniprogram/                      # WeChat Mini Program (separate project)
├── app.js/app.json/app.wxss      # App config & global styles
├── project.config.json           # WeChat project config
├── utils/api.js                  # API helper & formatters
└── pages/
    ├── index/                    # Dashboard overview
    ├── assets/                   # Asset management
    ├── liabilities/              # Liability management
    ├── transactions/             # Transaction list
    └── statistics/               # Statistics & prediction
```

## Database Schema (6 tables)

| Table | Purpose |
|-------|---------|
| `categories` | Income/expense/asset/liability categories with hierarchy |
| `assets` | Asset records (name, type, value, monthly income, yield) |
| `liabilities` | Liability records (name, type, principal, rate, payment) |
| `transactions` | Transaction records (type, amount, principal/interest split) |
| `reconciliations` | Reconciliation records (expected vs actual, auto-adjustment) |
| `monthly_snapshots` | Monthly aggregated stats (assets, liabilities, net worth) |

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/categories` | GET, POST, PUT, DELETE | Category CRUD |
| `/api/assets` | GET, POST, PUT, DELETE | Asset CRUD |
| `/api/liabilities` | GET, POST, PUT, DELETE | Liability CRUD |
| `/api/transactions` | GET, POST, PUT, DELETE | Transaction CRUD with auto-updates |
| `/api/reconciliations` | GET, POST | Reconciliation with auto-entry creation |
| `/api/statistics/monthly` | GET, POST | Monthly stats & snapshot generation |
| `/api/statistics/prediction` | GET | Cash flow prediction (6/12/24/36 months) |
| `/api/statistics/snapshot` | GET | Dashboard overview data |

## Key Design Patterns

### Transaction Auto-Updates
When creating transactions, the API automatically updates related assets/liabilities:
- `asset_value_change` → Updates asset's `currentValue`
- `liability_repayment` → Subtracts `principalPart` from liability's `remainingPrincipal`
- `liability_principal_change` → Adjusts liability's `remainingPrincipal`

### Reconciliation Auto-Adjustment
When reconciling, if `actualBalance != expectedBalance`, a `reconciliation` type transaction is auto-created to account for the difference.

### Cash Flow Prediction
Predicts N months ahead by:
1. Calculating monthly income from assets (interest/deposits auto-reinvest)
2. Calculating monthly payments from liabilities (principal + interest split)
3. Updating asset values and liability principals each month
4. Reporting net worth trajectory and cash flow over time

## Styling Conventions

- Dark theme: neutral-900/950 backgrounds, neutral-800 borders
- Green for positive values (assets, income)
- Red for negative values (liabilities, expenses, losses)
- Blue for neutral/worth metrics
- Orange for payment amounts
