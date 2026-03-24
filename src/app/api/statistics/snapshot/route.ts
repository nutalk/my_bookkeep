import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities, monthlySnapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
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
      allLiabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);

    // 获取最近的月度快照
    const recentSnapshots = await db
      .select()
      .from(monthlySnapshots)
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
  } catch {
    return NextResponse.json(
      { error: "获取总览数据失败" },
      { status: 500 }
    );
  }
}
