# Data Management Page Plan

## Files to Create

### 1. `src/app/api/export/route.ts` — Export API (GET)
Export all current user's data as JSON, includes:
- assets, liabilities, transactions, categories
- reconciliations, monthlySnapshots
- chatSessions + chatMessages

Response: downloadable JSON with all tables.

### 2. `src/app/api/data/clear/route.ts` — Clear API (POST)
Delete ALL data for current user from all tables:
- transactions, reconciliations, monthlySnapshots
- chatMessages, chatSessions
- assets, liabilities, categories
- sessions (log user out after clearing)

Requires confirmation token in body to prevent accidental clears.

## Files to Modify

### 3. `src/app/import/page.tsx` — Rewrite as Data Management Page
Three tabs: Import / Export / Clear

**Import tab**: existing import functionality (drag-and-drop, result display)
**Export tab**: button to download all data as JSON
**Export tab**: stats showing how many records will be exported
**Clear tab**: warning card + type-confirm input + clear button

### 4. `src/components/Sidebar.tsx` — Update navigation
Change: `{ href: "/import", label: "导入", icon: "://" }`  
To: `{ href: "/import", label: "数据管理", icon: "://" }`

### 5. `src/app/api/import/route.ts` — Update error message
Update the 409 error to guide users to use the Clear function on data management page.

## Tab UI Structure

```
┌────────────────────────────────────────────┐
│  数据管理                    [导入|导出|清空] │
├────────────────────────────────────────────┤
│  [Active tab content]                      │
│                                            │
│  导入: drag-drop + instructions + result   │
│  导出: download button + record counts     │
│  清空: danger zone warning + confirmation  │
└────────────────────────────────────────────┘
```
