# 家庭资产负债表 (Family Balance Sheet)

家庭资产、负债、现金流综合管理平台，支持 Web 端和微信小程序。

## 功能特性

- **用户管理**：手机号注册/登录、微信扫码登录
- **资产管理**：房产、存款、投资、收入来源等资产的记录与跟踪
- **负债管理**：房贷、车贷、信用卡、个人贷款的还款进度管理
- **记账功能**：收入、支出、资产变动、负债还款的分类记录
- **对账功能**：定期对账，自动生成差额调整记录
- **月度统计**：月度资产/负债/净资产/现金流快照
- **现金流预测**：基于当前资产收益率和负债还款计划的未来预测

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 16 | React 框架 (App Router) |
| React 19 | 前端 UI |
| Tailwind CSS 4 | 样式 |
| Cloudflare D1 | 数据库 (SQLite) |
| Drizzle ORM | 数据库 ORM (sqlite 方言) |
| Cloudflare Workers | 部署平台 (@opennextjs/cloudflare) |
| Web Crypto (PBKDF2) | 密码加密 |
| Bun | 包管理 & 构建 |

## 快速开始

### 环境要求

- [Bun](https://bun.sh/) (v1.x)
- [Node.js](https://nodejs.org/) 18+（wrangler 需要）

### 1. 安装依赖

```bash
bun install
```

### 2. 配置 Cloudflare 凭据

登录 Cloudflare CLI：

```bash
bunx wrangler login
```

### 3. 创建 D1 数据库

```bash
bunx wrangler d1 create bookkeep-db
```

将输出的 `database_id` 填入 `wrangler.jsonc` 的 `d1_databases[0].database_id`。

### 4. 本地开发

```bash
# 生成本地 D1 数据库并应用迁移
bun db:migrate

# 启动开发服务器（D1 本地模拟）
bun dev
```

访问 http://localhost:3000

### 环境变量

| 变量 | 说明 | 是否必填 |
|------|------|---------|
| `WECHAT_APP_ID` | 微信开放平台 AppID | 否 |
| `WECHAT_APP_SECRET` | 微信开放平台 AppSecret | 否 |
| `NEXT_PUBLIC_WECHAT_APP_ID` | 微信开放平台 AppID（前端） | 否 |

本地开发时写入 `.dev.vars`（本地模拟的 binding 由 wrangler 注入）。

## Cloudflare 部署

### 配置 GitHub Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（具备 Workers 和 D1 编辑权限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |

### 触发条件

- 推送到 `main` 分支 → 自动应用 D1 迁移并部署到 Workers
- 创建 `v*` 标签 → 同上
- Pull Request → 仅构建验证

### 手动部署

```bash
bun run deploy
```

### 远程数据库迁移

```bash
bun db:migrate:remote
```

## 项目结构

```
src/
├── app/
│   ├── login/page.tsx          # 登录/注册页面
│   ├── page.tsx                # 首页仪表盘
│   ├── assets/page.tsx         # 资产管理
│   ├── liabilities/page.tsx    # 负债管理
│   ├── transactions/page.tsx   # 记账
│   ├── reconciliations/page.tsx # 对账
│   ├── statistics/page.tsx     # 统计分析
│   └── api/                    # API 路由
│       ├── auth/               # 认证接口
│       ├── assets/             # 资产接口
│       ├── liabilities/        # 负债接口
│       ├── transactions/       # 记账接口
│       ├── reconciliations/    # 对账接口
│       └── statistics/         # 统计接口
├── components/                 # 公共组件
├── lib/                        # 工具函数
├── db/                         # 数据库配置 & Schema
└── middleware.ts                # 认证中间件
```

## 开发命令

```bash
bun dev              # 启动开发服务器
bun build            # Next.js 生产构建
bun lint             # ESLint 检查
bun typecheck        # TypeScript 类型检查
bun db:generate      # 生成 Drizzle 迁移
bun db:migrate       # 应用迁移到本地 D1
bun db:migrate:remote # 应用迁移到远程 D1
bun run preview      # OpenNext 本地预览（Workers 运行时）
bun run deploy       # 构建并部署到 Cloudflare Workers
```

## License

Private
