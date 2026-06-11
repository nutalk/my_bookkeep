# Agent Instructions for my_bookkeep

## Critical Rules

- **Package manager**: Use `bun` (not npm/yarn)
- **Never run** `next dev` or `bun dev` - the sandbox handles this automatically
- **No test framework** exists - do not try to run tests
- **Always commit and push** after completing changes:
  ```bash
  bun typecheck && bun lint && git add -A && git commit -m "descriptive message" && git push
  ```

## Commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies |
| `bun build` | Build production app |
| `bun lint` | Check code quality |
| `bun typecheck` | Type checking |
| `bun db:generate` | Generate Drizzle migrations from schema changes |
| `bun db:migrate` | Run Drizzle Kit migrations (also used in docker-entrypoint.sh) |

## Architecture

- **Framework**: Next.js 16 with App Router
- **Database**: MySQL 8.0 with Drizzle ORM (`drizzle-orm/mysql2`)
- **Auth**: Session-based (httpOnly cookie `session_token`)
- **Data isolation**: All user-scoped tables have `user_id` FK; API routes filter by `user_id`
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` plugin (not v3 config file approach)
- **Runtime**: Bun for package management and build; standalone Next.js output for Docker
- **Path alias**: `@/*` maps to `./src/*` (configured in tsconfig.json)

### Layout Structure

Root layout (`src/app/layout.tsx`) wraps all pages in a three-column layout:
- **Sidebar** (`src/components/Sidebar.tsx`) — navigation + user info
- **main** — page content (children)
- **AIChatPanel** (`src/components/AIChatPanel.tsx`) — collapsible, resizable AI chat

All wrapped in `ChatProvider` context (`src/lib/chat-context.tsx`) for panel toggle state.

### Database Schema (10 tables)

Defined in `src/db/schema.ts`:

| Table | Purpose | Key Detail |
|-------|---------|------------|
| `users` | User accounts | phone (unique), wechatOpenid (unique), passwordHash |
| `sessions` | Session tokens | 30-day expiry, linked to users |
| `categories` | Custom categories | type: income/expense/asset/liability, optional parentId |
| `assets` | Financial assets | type: real_estate/deposit/investment/income_source/other, soft-delete via `isActive` |
| `liabilities` | Financial liabilities | type: mortgage/car_loan/credit_card/personal_loan/other, soft-delete via `isActive` |
| `transactions` | All financial transactions | 8 types, can link to asset/liability, has principalPart/interestPart |
| `reconciliations` | Account reconciliations | Links to asset or liability, auto-creates adjustment transaction |
| `chat_sessions` | AI chat sessions | Per-user, has title |
| `chat_messages` | AI chat messages | CASCADE delete with session, role: user/assistant |
| `monthly_snapshots` | Monthly financial snapshots | Stores totalAssets, totalLiabilities, netWorth, JSON breakdowns |

### Dual Migration System

This project has two migration mechanisms:
1. **`src/db/migrate.ts`** — manual `CREATE TABLE IF NOT EXISTS` statements (used by docker-entrypoint.sh for fresh setups)
2. **Drizzle Kit** (`src/db/migrations/`) — generated migrations from schema changes

When adding schema changes: update `src/db/schema.ts`, run `bun db:generate`, AND update `src/db/migrate.ts` manually.

### API Route Structure

21 API routes under `src/app/api/`. Auth patterns:
- `requireUser()` — throws "UNAUTHORIZED" for 401 response; use for protected routes
- `getSessionUser()` — returns user or null; use for optional-auth routes (e.g., `/api/auth/me`)
- Public routes (no auth): `/api/auth/*`, `/api/health`

Standard error handling pattern:
```typescript
try {
  const user = await requireUser();
  // ... business logic ...
} catch (e) {
  if ((e as Error).message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  return NextResponse.json({ error: "操作失败" }, { status: 500 });
}
```

### Critical Business Logic: Transaction Side Effects

When creating transactions (`POST /api/transactions`), the API automatically updates related records:
- Asset-related transactions update `assets.currentValue`
- Liability-related transactions update `liabilities.remainingPrincipal`
- Principal/interest split tracked via `principalPart` and `interestPart` fields

Assets and liabilities use **soft-delete** (set `isActive = false`) when referenced by existing transactions, rather than hard deletion.

### AI Chat Architecture

The AI chat (`src/app/api/ai-chat/route.ts`) proxies to user-configured OpenAI-compatible APIs with:
- Streaming SSE responses
- Financial context injection (fetches user's assets, liabilities, recent transactions)
- Action parsing: the AI can emit `【操作:action_name】{json}` blocks that trigger database operations
- Config stored in client-side localStorage (API key, base URL, model)

## Key Patterns

### MySQL Drizzle Patterns
- No `.returning()` — use insert → get `insertId` → select pattern
- Use `mysqlTable` instead of `sqliteTable`
- Use `serial` for auto-increment primary keys
- Use `double` instead of `real` for floating point
- Use `datetime` instead of `integer` for timestamps
- Use `boolean` instead of `integer { mode: "boolean" }`

### Component Conventions
- All components in `src/components/` (8 total)
- Charts are custom SVG implementations (PieChart, HorizontalBarChart, BalanceChart) — no external chart library
- Markdown rendering is custom (`MarkdownContent.tsx`) — no external markdown library
- No form library — hand-rolled forms in `Forms.tsx`
- No state management library — React `useState` + context only
- Client components use `"use client"` directive; `MarkdownContent.tsx` is RSC-compatible

### API Routes
- Return `NextResponse.json({ error: "..." }, { status: 500 })` on failure
- Always include appropriate status codes
- Chinese error messages (e.g., `"请先登录"`, `"操作失败"`)

## Styling Conventions

- Dark theme: neutral-950 (page bg), neutral-900 (card bg), neutral-800 (borders)
- Green for positive values (assets, income)
- Red for negative values (liabilities, expenses, losses)
- Blue for neutral/worth metrics
- Orange for payment amounts

## WeChat Mini Program

Located in `miniprogram/` directory. Standard WeChat Mini Program structure:
- Pages: index, assets, liabilities, transactions, statistics (5 tabs)
- WXML templates, WXSS styles, JS logic
- Communicates with backend API via `wx.request` using shared `utils/api.js` helper
- `app.js` auto-detects environment to set `baseUrl` (localhost:3000 for dev, production domain for release)

## Docker Deployment

- `next.config.ts` sets `output: "standalone"` for minimal Docker image
- Multi-stage Dockerfile using `oven/bun:1` base image
- `docker-entrypoint.sh`: waits for MySQL, runs `bun db:migrate`, starts `bun server.js`
- GitHub Actions builds for `linux/amd64` + `linux/arm64`
- Docker image: `nutalk/my-bookkeep`
- Push to `main` → `latest` tag; `v*` tag → version tag; PR → build only

## Environment Variables

Required:
```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=bookkeep
MYSQL_PASSWORD=your_password_here
MYSQL_DATABASE=bookkeep
```

Optional (for WeChat login):
```bash
WECHAT_APP_ID=
WECHAT_APP_SECRET=
NEXT_PUBLIC_WECHAT_APP_ID=
```

## Outdated Files to Ignore

- `.kilocode/recipes/add-database.md` — references SQLite, this project uses MySQL
