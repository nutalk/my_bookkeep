# Product Context: 家庭资产负债表

## Why This Exists

Most personal finance apps focus on income/expense tracking. This application focuses on the balance sheet perspective: tracking the value and cash-flow generation of assets, the repayment progress of liabilities, and providing forward-looking predictions based on current financial positions.

## Problems It Solves

1. **Multi-user Support**: Each user has their own account with isolated data
2. **Asset Tracking**: Records asset values and their ability to generate cash flow (monthly income, annual yield)
3. **Liability Tracking**: Tracks remaining principal, interest rates, monthly payments, and repayment progress
4. **Cash Flow Analysis**: Shows monthly cash flow capability from all assets minus all liability payments
5. **Forward Prediction**: Predicts future net worth and cash flow based on current asset yields and liability repayment schedules
6. **Reconciliation**: Allows periodic balance checks with auto-adjustment entries

## User Flow

1. User registers with phone number or logs in with WeChat
2. User adds assets (deposits, real estate, investments, income sources) with current values and income parameters
3. User adds liabilities (mortgages, loans) with principal, rates, and payment schedules
4. User records transactions (income, expenses, asset changes, repayments) with categories
5. Dashboard shows real-time total assets, liabilities, net worth, and monthly cash flow
6. Statistics page provides monthly snapshots and cash flow predictions
7. Reconciliation page allows checking actual vs expected balances

## Key User Experience Goals

- **Dark Theme**: Professional dark UI for financial data display
- **Real-time Overview**: Dashboard with key financial metrics at a glance
- **Dual Platform**: Web frontend for desktop use, WeChat Mini Program for mobile
- **CNY Formatting**: All monetary values formatted as Chinese Yuan
- **Chinese Interface**: Full Chinese language UI
- **Easy Login**: Phone number or WeChat QR code login

## Platform Details

- **Web**: Next.js App Router with Server Components and API routes
- **Mini Program**: WeChat Mini Program consuming the same backend API
- **Auth**: Session-based authentication with httpOnly cookies
