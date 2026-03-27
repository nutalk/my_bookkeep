import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities, monthlySnapshots } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const allAssets = await db
      .select()
      .from(assets)
      .where(and(eq(assets.isActive, true), eq(assets.userId, user.id)));

    const allLiabilities = await db
      .select()
      .from(liabilities)
      .where(and(eq(liabilities.isActive, true), eq(liabilities.userId, user.id)));

    const totalAssets = allAssets.reduce(
      (sum, a) => sum + a.currentValue,
      0
    );
    const totalLiabilities = allLiabilities.reduce(
      (sum, l) => sum + l.remainingPrincipal,
      0
    );
    const netWorth = totalAssets - totalLiabilities;
    const monthlyCashFlow =
      allAssets.reduce((sum, a) => sum + (a.monthlyIncome ?? 0), 0) -
      allLiabilities.reduce((sum, l) => {
        const method = l.repaymentMethod || "equal_installment";
        if (method === "equal_installment") return sum + l.monthlyPayment;
        if (method === "interest_only") {
          return sum + (l.remainingPrincipal * l.annualRate) / 12;
        }
        return sum;
      }, 0);

    const recentSnapshots = await db
      .select()
      .from(monthlySnapshots)
      .where(eq(monthlySnapshots.userId, user.id))
      .orderBy(desc(monthlySnapshots.month))
      .limit(6);

    return NextResponse.json({
      overview: {
        totalAssets,
        totalLiabilities,
        netWorth,
        monthlyCashFlow,
        assetCount: allAssets.length,
        liabilityCount: allLiabilities.length,
      },
      assets: allAssets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currentValue: a.currentValue,
        monthlyIncome: a.monthlyIncome ?? 0,
      })),
      liabilities: allLiabilities.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        remainingPrincipal: l.remainingPrincipal,
        monthlyPayment: l.monthlyPayment,
        annualRate: l.annualRate,
      })),
      recentSnapshots,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "获取总览数据失败" },
      { status: 500 }
    );
  }
}
