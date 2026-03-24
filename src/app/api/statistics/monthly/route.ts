import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities, transactions, monthlySnapshots } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const startMonth = searchParams.get("startMonth");
    const endMonth = searchParams.get("endMonth");

    // 如果指定了月份范围，返回月度快照历史
    if (startMonth && endMonth) {
      const snapshots = await db
        .select()
        .from(monthlySnapshots)
        .where(
          and(
            gte(monthlySnapshots.month, startMonth),
            lte(monthlySnapshots.month, endMonth)
          )
        )
        .orderBy(monthlySnapshots.month);
      return NextResponse.json(snapshots);
    }

    // 如果指定了单月，实时计算该月统计
    if (month) {
      const stats = await calculateMonthlyStats(month);
      return NextResponse.json(stats);
    }

    // 默认返回已有快照列表
    const snapshots = await db
      .select()
      .from(monthlySnapshots)
      .orderBy(desc(monthlySnapshots.month))
      .limit(12);
    return NextResponse.json(snapshots);
  } catch {
    return NextResponse.json(
      { error: "获取月度统计失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const month = body.month;
    const stats = await calculateMonthlyStats(month);

    // 保存快照
    const existing = await db
      .select()
      .from(monthlySnapshots)
      .where(eq(monthlySnapshots.month, month));

    if (existing.length) {
      await db
        .update(monthlySnapshots)
        .set({
          totalAssets: stats.totalAssets,
          totalLiabilities: stats.totalLiabilities,
          netWorth: stats.netWorth,
          monthlyCashFlow: stats.monthlyCashFlow,
          assetBreakdown: JSON.stringify(stats.assetBreakdown),
          liabilityBreakdown: JSON.stringify(stats.liabilityBreakdown),
        })
        .where(eq(monthlySnapshots.month, month));
    } else {
      await db.insert(monthlySnapshots).values({
        month,
        totalAssets: stats.totalAssets,
        totalLiabilities: stats.totalLiabilities,
        netWorth: stats.netWorth,
        monthlyCashFlow: stats.monthlyCashFlow,
        assetBreakdown: JSON.stringify(stats.assetBreakdown),
        liabilityBreakdown: JSON.stringify(stats.liabilityBreakdown),
      });
    }

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "生成月度快照失败" },
      { status: 500 }
    );
  }
}

async function calculateMonthlyStats(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59);

  // 获取所有活跃资产
  const allAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.isActive, true));

  // 获取所有活跃负债
  const allLiabilities = await db
    .select()
    .from(liabilities)
    .where(eq(liabilities.isActive, true));

  // 获取当月交易记录
  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.transactionDate, monthStart),
        lte(transactions.transactionDate, monthEnd)
      )
    );

  // 计算资产总值
  const totalAssets = allAssets.reduce(
    (sum, a) => sum + a.currentValue,
    0
  );

  // 计算负债总额
  const totalLiabilities = allLiabilities.reduce(
    (sum, l) => sum + l.remainingPrincipal,
    0
  );

  // 净值
  const netWorth = totalAssets - totalLiabilities;

  // 月现金流 = 资产月收入 - 负债月还款
  const monthlyAssetIncome = allAssets.reduce(
    (sum, a) => sum + (a.monthlyIncome ?? 0),
    0
  );
  const monthlyLiabilityPayment = allLiabilities.reduce(
    (sum, l) => sum + l.monthlyPayment,
    0
  );
  const monthlyCashFlow = monthlyAssetIncome - monthlyLiabilityPayment;

  // 资产分类明细
  const assetBreakdown = allAssets.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    value: a.currentValue,
    monthlyIncome: a.monthlyIncome ?? 0,
  }));

  // 负债分类明细
  const liabilityBreakdown = allLiabilities.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    remainingPrincipal: l.remainingPrincipal,
    monthlyPayment: l.monthlyPayment,
    annualRate: l.annualRate,
  }));

  // 当月交易汇总
  const incomeTotal = monthTransactions
    .filter((t) => t.type === "income" || t.type === "asset_income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const repaymentTotal = monthTransactions
    .filter((t) => t.type === "liability_repayment")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    month,
    totalAssets,
    totalLiabilities,
    netWorth,
    monthlyCashFlow,
    monthlyAssetIncome,
    monthlyLiabilityPayment,
    incomeTotal,
    expenseTotal,
    repaymentTotal,
    transactionCount: monthTransactions.length,
    assetBreakdown,
    liabilityBreakdown,
  };
}
