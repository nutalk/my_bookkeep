# Project Brief: 家庭资产负债表 (Family Balance Sheet)

## Purpose

A comprehensive family balance sheet tracking application with web frontend, backend API, and WeChat Mini Program. Tracks assets, liabilities, cash flow, and provides financial predictions.

## Target Users

- Families wanting to track their net worth
- Individuals managing multiple assets and liabilities
- Users needing cash flow prediction and monthly statistics

## Core Features

1. **用户管理**: Account registration/login with phone number, WeChat QR code login
2. **资产管理**: Track assets (real estate, deposits, investments, income sources) with current value and cash flow generation
3. **负债管理**: Track liabilities (mortgage, car loan, credit card, personal loans) with repayment and principal changes
4. **记账功能**: Categorized transaction recording for income, expenses, asset changes, and liability payments
5. **对账功能**: Periodic reconciliation with auto-generated adjustment entries when differences are found
6. **月度统计**: Monthly snapshots of total assets, liabilities, net worth, and cash flow
7. **现金流预测**: Predict future assets, liabilities, and monthly cash flow based on current positions

## Business Rules

- Personal income is treated as an asset that generates cash flow
- Only real estate has physical asset value (other physical items ignored)
- No depreciation considered for any asset
- Reconciliation auto-creates transaction entries for balance differences
- Each user's data is isolated by user_id

## Key Requirements

### Must Have
- Next.js 16 backend API with MySQL + Drizzle ORM
- React web frontend with dark theme
- User authentication (phone + password, WeChat OAuth)
- WeChat Mini Program frontend
- TypeScript for type safety
- Tailwind CSS 4 for styling
- Bun as package manager

## Constraints

- Framework: Next.js 16 + React 19 + Tailwind CSS 4
- Database: MySQL via Drizzle ORM + mysql2
- Package manager: Bun
- Auth: Session-based with httpOnly cookies
