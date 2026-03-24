# Technical Context: 家庭资产负债表

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.9.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS |
| Drizzle ORM | 0.45.x | Database ORM |
| @kilocode/app-builder-db | latest | SQLite database provider |
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
bun db:migrate     # Run migrations (auto in sandbox)
```

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
- Dialect: sqlite

## Key Dependencies

### Production
```json
{
  "@kilocode/app-builder-db": "github:Kilo-Org/app-builder-db#main",
  "drizzle-orm": "^0.45.1",
  "next": "^16.1.3",
  "react": "^19.2.3",
  "react-dom": "^19.2.3"
}
```

### Dev
```json
{
  "drizzle-kit": "^0.31.10",
  "typescript": "^5.9.3",
  "tailwindcss": "^4.1.17",
  "eslint": "^9.39.1",
  "eslint-config-next": "^16.0.0"
}
```

## WeChat Mini Program

Located in `miniprogram/` directory. Uses standard WeChat Mini Program structure:
- WXML templates, WXSS styles, JS logic
- Communicates with backend API via `wx.request`
- Configurable base URL in `app.js` for dev/prod environments

## Environment

- Database credentials (`DB_URL`, `DB_TOKEN`) auto-provided by sandbox
- Migrations run automatically after push in sandbox
- Never run `bun db:migrate` manually in sandbox
