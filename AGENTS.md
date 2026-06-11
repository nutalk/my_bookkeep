# Agent Instructions for my_bookkeep

## Critical Rules

- **Package manager**: Use `bun` (not npm/yarn)
- **Never run** `next dev` or `bun dev` - the sandbox handles this automatically
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
| `bun db:generate` | Generate Drizzle migrations |
| `bun db:migrate` | Run migrations (used in docker-entrypoint.sh) |

## Architecture

- **Framework**: Next.js 16 with App Router
- **Database**: MySQL 8.0 with Drizzle ORM
- **Auth**: Session-based (httpOnly cookie `session_token`)
- **Data isolation**: All tables have `user_id` foreign key; API routes filter by `user_id`

## Key Patterns

### Authentication Flow
1. User registers/logs in via phone or WeChat
2. Server creates session token (30-day expiry) stored in `sessions` table
3. Token set as httpOnly cookie (`session_token`)
4. Middleware checks cookie on page navigations, redirects to `/login` if missing
5. API routes use `requireUser()` to extract user from session

### MySQL Drizzle Patterns
- No `.returning()` - use insert → get insertId → select pattern
- Use `mysqlTable` instead of `sqliteTable`
- Use `serial` for auto-increment primary keys
- Use `double` instead of `real` for floating point
- Use `datetime` instead of `integer` for timestamps
- Use `boolean` instead of `integer { mode: "boolean" }`

### API Routes
- Return `NextResponse.json({ error: "..." }, { status: 500 })` on failure
- Always include appropriate status codes
- Handle errors gracefully

## Styling Conventions

- Dark theme: neutral-900/950 backgrounds, neutral-800 borders
- Green for positive values (assets, income)
- Red for negative values (liabilities, expenses, losses)
- Blue for neutral/worth metrics
- Orange for payment amounts

## WeChat Mini Program

Located in `miniprogram/` directory. Uses standard WeChat Mini Program structure:
- WXML templates, WXSS styles, JS logic
- Communicates with backend API via `wx.request`
- Configurable base URL in `app.js` for dev/prod environments

## Memory Bank

After completing significant changes, update `.kilocode/rules/memory-bank/context.md`:
- Add to "Recently Completed" section with checkboxes
- Update "Current State" if project status changed
- Add entry to "Session History" with date and brief description

## Environment Variables

Required for local development:
```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=bookkeep
MYSQL_PASSWORD=your_password_here
MYSQL_DATABASE=bookkeep
```

Optional for WeChat login:
```bash
WECHAT_APP_ID=
WECHAT_APP_SECRET=
NEXT_PUBLIC_WECHAT_APP_ID=
```

## CI/CD

GitHub Actions workflow builds Docker image on push to `main` or `v*` tags.
- Push to `main` → builds and pushes `latest` tag
- Create `v*` tag → builds and pushes version tag
- Pull request → builds only, no push

## Recipes

The `.kilocode/recipes/add-database.md` is outdated (references SQLite). Ignore it - this project uses MySQL.
