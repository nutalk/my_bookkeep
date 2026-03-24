# Technical Context: 家庭资产负债表

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.9.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS |
| Drizzle ORM | 0.45.x | Database ORM |
| mysql2 | 3.20.x | MySQL driver |
| bcryptjs | 3.0.x | Password hashing |
| drizzle-kit | 0.31.x | Migration generation |
| Bun | Latest | Package manager & runtime |

## Development Commands

```bash
bun install        # Install dependencies
bun dev            # Start dev server (http://localhost:3000)
bun build          # Production build
bun start          # Start production server
bun lint           # Run ESLint
bun typecheck      # Run TypeScript type checking
bun db:generate    # Generate Drizzle migrations
bun db:migrate     # Run migrations
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| MYSQL_HOST | MySQL server host | localhost |
| MYSQL_PORT | MySQL server port | 3306 |
| MYSQL_USER | MySQL username | root |
| MYSQL_PASSWORD | MySQL password | (empty) |
| MYSQL_DATABASE | Database name | family_balance_sheet |
| WECHAT_APP_ID | WeChat OAuth App ID | - |
| WECHAT_APP_SECRET | WeChat OAuth App Secret | - |
| NEXT_PUBLIC_WECHAT_APP_ID | WeChat App ID for frontend | - |

## Project Configuration

### TypeScript Config
- Strict mode enabled
- Path alias: `@/*` → `src/*`
- Target: ESNext

### Tailwind CSS 4
- Uses `@tailwindcss/postcss` plugin
- CSS-first configuration (v4 style)

### ESLint
- Uses `eslint-config-next`
- Flat config format

### Drizzle
- Schema: `./src/db/schema.ts`
- Migrations: `./src/db/migrations/`
- Dialect: mysql

## WeChat Mini Program

Located in `miniprogram/` directory. Uses standard WeChat Mini Program structure:
- WXML templates, WXSS styles, JS logic
- Communicates with backend API via `wx.request`
- Configurable base URL in `app.js` for dev/prod environments
