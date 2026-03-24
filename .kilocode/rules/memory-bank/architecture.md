# System Patterns: 家庭资产负债表

## Architecture Overview

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with Sidebar
│   ├── page.tsx                  # Dashboard (overview, auth-protected)
│   ├── globals.css               # Tailwind styles
│   ├── login/page.tsx            # Login/Register page
│   ├── assets/page.tsx           # Asset management page
│   ├── liabilities/page.tsx      # Liability management page
│   ├── transactions/page.tsx     # Transaction list page
│   ├── reconciliations/page.tsx  # Reconciliation page
│   ├── statistics/page.tsx       # Statistics & prediction page
│   └── api/                      # API routes (backend)
│       ├── auth/
│       │   ├── register/route.ts # Phone + password registration
│       │   ├── login/route.ts    # Phone + password login
│       │   ├── wechat/route.ts   # WeChat OAuth login
│       │   ├── logout/route.ts   # Session cleanup
│       │   └── me/route.ts       # Current user info
│       ├── categories/route.ts   # CRUD for categories (user-scoped)
│       ├── assets/route.ts       # CRUD for assets (user-scoped)
│       ├── liabilities/route.ts  # CRUD for liabilities (user-scoped)
│       ├── transactions/route.ts # CRUD for transactions (user-scoped)
│       ├── reconciliations/route.ts # Reconciliation (user-scoped)
│       └── statistics/
│           ├── monthly/route.ts  # Monthly stats (user-scoped)
│           ├── prediction/route.ts # Cash flow prediction (user-scoped)
│           └── snapshot/route.ts # Dashboard overview (user-scoped)
├── components/
│   ├── Sidebar.tsx               # Navigation sidebar + user info + logout
│   └── Forms.tsx                 # AssetForm, LiabilityForm, TransactionForm
├── lib/
│   ├── auth.ts                   # Session management (create/get/delete)
│   └── utils.ts                  # Format helpers (money, date, type labels)
├── db/
│   ├── schema.ts                 # Drizzle schema (8 tables, MySQL)
│   ├── index.ts                  # Database client (mysql2)
│   ├── migrate.ts                # Migration runner
│   └── migrations/               # Auto-generated SQL migrations
└── middleware.ts                  # Auth protection for page routes

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

## Database Schema (8 tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (phone, password_hash, nickname, wechat_openid) |
| `sessions` | Auth sessions (user_id, token, expires_at) |
| `categories` | Income/expense/asset/liability categories (user-scoped) |
| `assets` | Asset records (user-scoped) |
| `liabilities` | Liability records (user-scoped) |
| `transactions` | Transaction records (user-scoped) |
| `reconciliations` | Reconciliation records (user-scoped) |
| `monthly_snapshots` | Monthly aggregated stats (user-scoped) |

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/register` | POST | Phone + password registration |
| `/api/auth/login` | POST | Phone + password login |
| `/api/auth/wechat` | POST | WeChat OAuth login |
| `/api/auth/logout` | POST | Logout (delete session) |
| `/api/auth/me` | GET | Get current user info |
| `/api/categories` | GET, POST, PUT, DELETE | Category CRUD (auth required) |
| `/api/assets` | GET, POST, PUT, DELETE | Asset CRUD (auth required) |
| `/api/liabilities` | GET, POST, PUT, DELETE | Liability CRUD (auth required) |
| `/api/transactions` | GET, POST, PUT, DELETE | Transaction CRUD (auth required) |
| `/api/reconciliations` | GET, POST | Reconciliation (auth required) |
| `/api/statistics/monthly` | GET, POST | Monthly stats (auth required) |
| `/api/statistics/prediction` | GET | Cash flow prediction (auth required) |
| `/api/statistics/snapshot` | GET | Dashboard overview (auth required) |

## Key Design Patterns

### Authentication Flow
1. User registers/logs in via phone or WeChat
2. Server creates a session token (30-day expiry) stored in `sessions` table
3. Token is set as httpOnly cookie (`session_token`)
4. Middleware checks cookie on page navigations, redirects to `/login` if missing
5. API routes use `requireUser()` to extract user from session and filter data by `user_id`

### Data Isolation
All existing tables have a `user_id` foreign key. Every API query includes `eq(table.userId, user.id)` in WHERE clause to ensure users only see their own data.

### MySQL Pattern Changes from SQLite
- No `.returning()` - use insert → get insertId → select pattern
- Use `mysqlTable` instead of `sqliteTable`
- Use `serial` for auto-increment primary keys
- Use `double` instead of `real` for floating point
- Use `datetime` instead of `integer` for timestamps
- Use `boolean` instead of `integer { mode: "boolean" }`

### Transaction Auto-Updates
When creating transactions, the API automatically updates related assets/liabilities (same as before, now user-scoped).

### Cash Flow Prediction
Predicts N months ahead with asset yield compounding and liability principal reduction (same as before, now user-scoped).

## Styling Conventions

- Dark theme: neutral-900/950 backgrounds, neutral-800 borders
- Green for positive values (assets, income)
- Red for negative values (liabilities, expenses, losses)
- Blue for neutral/worth metrics
- Orange for payment amounts
