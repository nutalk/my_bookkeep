# Product Context: 家庭资产负债表

## Why This Exists

Most personal finance apps focus on income/expense tracking. This application focuses on the balance sheet perspective: tracking the value and cash-flow generation of assets, the repayment progress of liabilities, and providing forward-looking predictions based on current financial positions.

## Problems It Solves

1. **Asset Tracking**: Records asset values and their ability to generate cash flow (monthly income, annual yield)
2. **Liability Tracking**: Tracks remaining principal, interest rates, monthly payments, and repayment progress
3. **Cash Flow Analysis**: Shows monthly cash flow capability from all assets minus all liability payments
4. **Forward Prediction**: Predicts future net worth and cash flow based on current asset yields and liability repayment schedules
5. **Reconciliation**: Allows periodic balance checks with auto-adjustment entries

## User Flow

1. User adds assets (deposits, real estate, investments, income sources) with current values and income parameters
2. User adds liabilities (mortgages, loans) with principal, rates, and payment schedules
3. User records transactions (income, expenses, asset changes, repayments) with categories
4. Dashboard shows real-time total assets, liabilities, net worth, and monthly cash flow
5. Statistics page provides monthly snapshots and cash flow predictions
6. Reconciliation page allows checking actual vs expected balances

## Key User Experience Goals

- **Dark Theme**: Professional dark UI for financial data display
- **Real-time Overview**: Dashboard with key financial metrics at a glance
- **Dual Platform**: Web frontend for desktop use, WeChat Mini Program for mobile
- **CNY Formatting**: All monetary values formatted as Chinese Yuan
- **Chinese Interface**: Full Chinese language UI

## Platform Details

- **Web**: Next.js App Router with Server Components and API routes
- **Mini Program**: WeChat Mini Program consuming the same backend API
