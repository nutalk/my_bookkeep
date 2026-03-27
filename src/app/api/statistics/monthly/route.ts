import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities, transactions, monthlySnapshots } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const startMonth = searchParams.get("startMonth");
    const endMonth = searchParams.get("endMonth");

    if (startMonth && endMonth) {
      const snapshots = await db
        .select()
        .from(monthlySnapshots)
        .where(
          and(
            eq(monthlySnapshots.userId, user.id),
            gte(monthlySnapshots.month, startMonth),
            lte(monthlySnapshots.month, endMonth)
          )
        )
        .orderBy(monthlySnapshots.month);
      return NextResponse.json(snapshots);
    }

    if (month) {
      const stats = await calculateMonthlyStats(month, user.id);
      return NextResponse.json(stats);
    }

    const snapshots = await db
      .select()
      .from(monthlySnapshots)
      .where(eq(monthlySnapshots.userId, user.id))
      .orderBy(desc(monthlySnapshots.month))
      .limit(12);
    return NextResponse.json(snapshots);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "获取月度统计失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const month = body.month;
    const stats = await calculateMonthlyStats(month, user.id);

    const existing = await db
      .select()
      .from(monthlySnapshots)
      .where(and(eq(monthlySnapshots.month, month), eq(monthlySnapshots.userId, user.id)));

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
        .where(and(eq(monthlySnapshots.month, month), eq(monthlySnapshots.userId, user.id)));
    } else {
      await db.insert(monthlySnapshots).values({
        userId: user.id,
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
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "生成月度快照失败" },
      { status: 500 }
    );
  }
}

async function calculateMonthlyStats(month: string, userId: number) {
  const [year, mon] = month.split("-").map(Number);
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59);

  const allAssets = await db
    .select()
    .from(assets)
    .where(and(eq(assets.isActive, true), eq(assets.userId, userId)));

  const allLiabilities = await db
    .select()
    .from(liabilities)
    .where(and(eq(liabilities.isActive, true), eq(liabilities.userId, userId)));

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, monthStart),
        lte(transactions.transactionDate, monthEnd)
      )
    );

  const totalAssets = allAssets.reduce(
    (sum, a) => sum + a.currentValue,
    0
  );

  const totalLiabilities = allLiabilities.reduce(
    (sum, l) => sum + l.remainingPrincipal,
    0
  );

  const netWorth = totalAssets - totalLiabilities;

  const monthlyAssetIncome = allAssets.reduce(
    (sum, a) => sum + (a.monthlyIncome ?? 0),
    0
  );
  const monthlyLiabilityPayment = allLiabilities.reduce((sum, l) => {
    const method = l.repaymentMethod || "equal_installment";
    if (method === "equal_installment") return sum + l.monthlyPayment;
    if (method === "interest_only") {
      return sum + (l.remainingPrincipal * l.annualRate) / 12;
    }
    // lump_sum: no regular monthly payment
    return sum;
  }, 0);
  const monthlyCashFlow = monthlyAssetIncome - monthlyLiabilityPayment;

  const assetBreakdown = allAssets.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    value: a.currentValue,
    monthlyIncome: a.monthlyIncome ?? 0,
  }));

  const liabilityBreakdown = allLiabilities.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    remainingPrincipal: l.remainingPrincipal,
    monthlyPayment: l.monthlyPayment,
    annualRate: l.annualRate,
    repaymentMethod: l.repaymentMethod || "equal_installment",
  }));

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
