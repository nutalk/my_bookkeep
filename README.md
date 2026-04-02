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
| MySQL 8.0 | 数据库 |
| Drizzle ORM | 数据库 ORM |
| mysql2 | MySQL 驱动 |
| bcryptjs | 密码加密 |
| Bun | 包管理 & 运行时 |
| Docker | 容器化部署 |

## 快速开始

### 环境要求

- [Bun](https://bun.sh/) (v1.x)
- MySQL 8.0+

### 1. 准备 MySQL

```sql
CREATE DATABASE bookkeep CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bookkeep'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON bookkeep.* TO 'bookkeep'@'%';
FLUSH PRIVILEGES;
```

### 2. 本地开发

```bash
# 克隆项目
git clone https://github.com/nutalk/my_bookkeep.git
cd my_bookkeep

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写 MySQL 连接信息

# 初始化数据库表
bun db:migrate

# 启动开发服务器
bun dev
```

访问 http://localhost:3000

### 环境变量

| 变量 | 说明 | 是否必填 |
|------|------|---------|
| `MYSQL_HOST` | MySQL 地址 | 是 |
| `MYSQL_PORT` | MySQL 端口 | 否，默认 3306 |
| `MYSQL_USER` | MySQL 用户名 | 是 |
| `MYSQL_PASSWORD` | MySQL 密码 | 是 |
| `MYSQL_DATABASE` | 数据库名 | 是 |
| `WECHAT_APP_ID` | 微信开放平台 AppID | 否 |
| `WECHAT_APP_SECRET` | 微信开放平台 AppSecret | 否 |

## Docker 部署

### 准备

确保已有可用的 MySQL 服务，并已创建数据库和用户（见上方 SQL）。

### 部署

```bash
# 克隆项目
git clone https://github.com/nutalk/my_bookkeep.git
cd my_bookkeep

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写你的 MySQL 连接信息

# 启动服务
docker-compose up -d
```

访问 http://localhost:3000

数据库表结构会在容器启动时自动创建（通过 `docker-entrypoint.sh`）。

### 使用已有 MySQL

```bash
docker run -d \
  --name bookkeep \
  -p 3000:3000 \
  -e MYSQL_HOST=your_mysql_host \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=bookkeep \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=bookkeep \
  nutalk/my-bookkeep:latest
```

## CI/CD

项目配置了 GitHub Actions，推送到 `main` 分支时自动构建 Docker 镜像并上传到 Docker Hub。

### 配置 GitHub Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 说明 |
|--------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token |

### 触发条件

- 推送到 `main` 分支 → 构建并推送 `latest` 标签
- 创建 `v*` 标签 → 构建并推送版本标签 (如 `v1.0.0`)
- Pull Request → 仅构建，不推送

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
bun dev            # 启动开发服务器
bun build          # 生产构建
bun start          # 启动生产服务器
bun lint           # ESLint 检查
bun typecheck      # TypeScript 类型检查
bun db:migrate     # 初始化/更新数据库表
```

## License

Private
