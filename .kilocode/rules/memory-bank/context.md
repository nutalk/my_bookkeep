# Active Context: 家庭资产负债表

## Current State

**Status**: Account management system implemented

The project now includes a full account management system with MySQL database, phone number registration/login, and WeChat QR code login support.

## Recently Completed

- [x] Migrated database from SQLite to MySQL (mysql2 driver)
- [x] Added `users` table (phone, password_hash, nickname, wechat_openid, avatar_url)
- [x] Added `sessions` table (user_id, token, expires_at)
- [x] Added `user_id` to all existing tables for data isolation
- [x] Created auth API routes: register, login, wechat, logout, me
- [x] Created login/register page with phone number and WeChat login
- [x] Added Next.js middleware for auth protection on page routes
- [x] Updated all API routes to filter by user_id
- [x] Updated Sidebar with user info display and logout button
- [x] Updated Dashboard page with user greeting and auth check
- [x] Removed old @kilocode/app-builder-db dependency
- [x] All lint and type checks passing

## Current Structure

| Component | File/Directory | Status |
|-----------|----------------|--------|
| Database schema | `src/db/schema.ts` | 8 tables (users, sessions + 6 original) |
| Database client | `src/db/index.ts` | MySQL via mysql2 |
| Migrations | `src/db/migrations/` | Cleared for MySQL regeneration |
| Drizzle config | `drizzle.config.ts` | MySQL dialect |
| Auth middleware | `src/middleware.ts` | Redirects to /login |
| Auth - Register | `src/app/api/auth/register/route.ts` | Phone + password |
| Auth - Login | `src/app/api/auth/login/route.ts` | Phone + password |
| Auth - WeChat | `src/app/api/auth/wechat/route.ts` | OAuth2 flow |
| Auth - Logout | `src/app/api/auth/logout/route.ts` | Session cleanup |
| Auth - Me | `src/app/api/auth/me/route.ts` | Current user info |
| Auth helper | `src/lib/auth.ts` | Session management |
| Login page | `src/app/login/page.tsx` | Phone/WeChat login UI |
| Sidebar | `src/components/Sidebar.tsx` | User info + logout |
| All API routes | `src/app/api/*/route.ts` | Updated with user_id filtering |

## Pending Improvements

- [ ] Add category management UI (currently only API)
- [ ] Add chart visualizations for statistics
- [ ] Add data export functionality
- [ ] WeChat Mini Program API integration update for auth
- [ ] Add password reset functionality

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-03-24 | Full implementation: database, API, web frontend, WeChat mini program |
| 2026-03-24 | Account system: MySQL migration, user auth, phone/WeChat login, data isolation |
