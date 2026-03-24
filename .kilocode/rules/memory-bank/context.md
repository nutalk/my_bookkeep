# Active Context: 家庭资产负债表

## Current State

**Status**: Initial implementation complete

The project has been transformed from a Next.js starter template into a full-featured family balance sheet tracking application with:
- SQLite database with Drizzle ORM
- RESTful API routes for all CRUD operations
- Web frontend with 6 pages (dashboard, assets, liabilities, transactions, reconciliations, statistics)
- WeChat Mini Program with 5 pages
- Cash flow prediction engine
- Monthly snapshot generation

## Recently Completed

- [x] Database schema: 6 tables (categories, assets, liabilities, transactions, reconciliations, monthly_snapshots)
- [x] API routes: categories, assets, liabilities, transactions, reconciliations, statistics
- [x] Web frontend: Dashboard, Assets, Liabilities, Transactions, Reconciliations, Statistics pages
- [x] Reusable form components: AssetForm, LiabilityForm, TransactionForm
- [x] Utility functions: formatMoney, formatDate, type label mappers
- [x] WeChat Mini Program: All 5 pages with API integration
- [x] Cash flow prediction: 6/12/24/36 month forward projection
- [x] Reconciliation with auto-adjustment entries
- [x] All lint and type checks passing

## Current Structure

| Component | File/Directory | Status |
|-----------|----------------|--------|
| Database schema | `src/db/schema.ts` | 6 tables defined |
| Database client | `src/db/index.ts` | Ready |
| Migrations | `src/db/migrations/` | Generated |
| API - Categories | `src/app/api/categories/route.ts` | CRUD complete |
| API - Assets | `src/app/api/assets/route.ts` | CRUD with soft-delete |
| API - Liabilities | `src/app/api/liabilities/route.ts` | CRUD with soft-delete |
| API - Transactions | `src/app/api/transactions/route.ts` | CRUD with auto-updates |
| API - Reconciliations | `src/app/api/reconciliations/route.ts` | Auto-adjustment |
| API - Statistics | `src/app/api/statistics/` | Monthly, prediction, snapshot |
| Web - Dashboard | `src/app/page.tsx` | Overview with key metrics |
| Web - Assets | `src/app/assets/page.tsx` | Management with table |
| Web - Liabilities | `src/app/liabilities/page.tsx` | Management with table |
| Web - Transactions | `src/app/transactions/page.tsx` | List with filters |
| Web - Reconciliations | `src/app/reconciliations/page.tsx` | Reconciliation form & history |
| Web - Statistics | `src/app/statistics/page.tsx` | Prediction & snapshots |
| Web - Layout | `src/app/layout.tsx` | Sidebar navigation |
| Components | `src/components/Sidebar.tsx`, `Forms.tsx` | Ready |
| Utils | `src/lib/utils.ts` | Formatters & helpers |
| Mini Program | `miniprogram/` | 5 pages, API integration |

## Pending Improvements

- [ ] Add category management UI (currently only API)
- [ ] Add authentication/user management
- [ ] Add chart visualizations for statistics
- [ ] Add data export functionality
- [ ] Add WeChat login integration for mini program

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-03-24 | Full implementation: database, API, web frontend, WeChat mini program |
