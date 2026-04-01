import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities, transactions } from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

interface MonthlySnapshot {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetDetails: { id: number; name: string; value: number }[];
  liabilityDetails: { id: number; name: string; value: number }[];
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const months = Number(searchParams.get("months") || "12");

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch all active assets
    const allAssets = await db
      .select()
      .from(assets)
      .where(and(eq(assets.isActive, true), eq(assets.userId, user.id)));

    // Fetch all active liabilities
    const allLiabilities = await db
      .select()
      .from(liabilities)
      .where(and(eq(liabilities.isActive, true), eq(liabilities.userId, user.id)));

    // Build current balances
    const assetCurrent: Record<number, { name: string; value: number }> = {};
    for (const a of allAssets) {
      assetCurrent[a.id] = { name: a.name, value: a.currentValue };
    }
    const liabilityCurrent: Record<number, { name: string; value: number }> = {};
    for (const l of allLiabilities) {
      liabilityCurrent[l.id] = { name: l.name, value: l.remainingPrincipal };
    }

    // Fetch all transactions for these assets/liabilities
    const assetIds = allAssets.map((a) => a.id);
    const liabilityIds = allLiabilities.map((l) => l.id);

    const allTxs: {
      type: string;
      amount: number;
      principalPart: number | null;
      assetId: number | null;
      liabilityId: number | null;
      transactionDate: Date;
    }[] = [];

    // Fetch asset transactions
    for (const aid of assetIds) {
      const txs = await db
        .select({
          type: transactions.type,
          amount: transactions.amount,
          principalPart: transactions.principalPart,
          assetId: transactions.assetId,
          liabilityId: transactions.liabilityId,
          transactionDate: transactions.transactionDate,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.assetId, aid)
          )
        )
        .orderBy(asc(transactions.transactionDate));
      allTxs.push(...txs);
    }

    // Fetch liability transactions
    for (const lid of liabilityIds) {
      const txs = await db
        .select({
          type: transactions.type,
          amount: transactions.amount,
          principalPart: transactions.principalPart,
          assetId: transactions.assetId,
          liabilityId: transactions.liabilityId,
          transactionDate: transactions.transactionDate,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.liabilityId, lid)
          )
        )
        .orderBy(asc(transactions.transactionDate));
      allTxs.push(...txs);
    }

    // Sort all transactions by date ascending
    allTxs.sort(
      (a, b) =>
        new Date(a.transactionDate).getTime() -
        new Date(b.transactionDate).getTime()
    );

    // Compute initial balances by walking backwards from current
    const assetBalances: Record<number, number> = {};
    for (const a of allAssets) {
      let bal = a.currentValue;
      for (const t of allTxs) {
        if (t.assetId === a.id) {
          if (t.type === "income" || t.type === "asset_income") {
            bal -= t.amount;
          } else if (t.type === "expense") {
            bal += t.amount;
          }
        }
      }
      assetBalances[a.id] = bal;
    }

    const liabilityBalances: Record<number, number> = {};
    for (const l of allLiabilities) {
      let bal = l.remainingPrincipal;
      for (const t of allTxs) {
        if (t.liabilityId === l.id) {
          if (t.type === "liability_principal_change") {
            bal -= t.amount;
          } else if (t.type === "liability_repayment") {
            const pr = (t.principalPart ?? 0) > 0 ? t.principalPart! : t.amount;
            bal += pr;
          }
        }
      }
      liabilityBalances[l.id] = bal;
    }

    // Build month keys for the requested range
    const monthKeys: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      monthKeys.push(`${y}-${String(m).padStart(2, "0")}`);
    }

    // Walk forward month by month, applying transactions
    const monthEndAsset: Record<string, Record<number, number>> = {};
    const monthEndLiability: Record<string, Record<number, number>> = {};

    let txIdx = 0;
    for (const monthKey of monthKeys) {
      const [yStr, mStr] = monthKey.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999); // last day of month

      // Apply all transactions up to end of this month
      while (
        txIdx < allTxs.length &&
        new Date(allTxs[txIdx].transactionDate).getTime() <= monthEnd.getTime()
      ) {
        const t = allTxs[txIdx];
        if (t.assetId && t.assetId in assetBalances) {
          if (t.type === "income" || t.type === "asset_income") {
            assetBalances[t.assetId] += t.amount;
          } else if (t.type === "expense") {
            assetBalances[t.assetId] -= t.amount;
          }
        }
        if (t.liabilityId && t.liabilityId in liabilityBalances) {
          if (t.type === "liability_principal_change") {
            liabilityBalances[t.liabilityId] += t.amount;
          } else if (t.type === "liability_repayment") {
            const pr = (t.principalPart ?? 0) > 0 ? t.principalPart! : t.amount;
            liabilityBalances[t.liabilityId] -= pr;
          }
        }
        txIdx++;
      }

      // Snapshot balances at end of this month
      monthEndAsset[monthKey] = { ...assetBalances };
      monthEndLiability[monthKey] = { ...liabilityBalances };
    }

    // Build response
    const snapshots: MonthlySnapshot[] = monthKeys.map((monthKey) => {
      const aBal = monthEndAsset[monthKey] || {};
      const lBal = monthEndLiability[monthKey] || {};

      const assetDetails = allAssets.map((a) => ({
        id: a.id,
        name: a.name,
        value: Math.max(0, aBal[a.id] ?? 0),
      }));
      const liabilityDetails = allLiabilities.map((l) => ({
        id: l.id,
        name: l.name,
        value: Math.max(0, lBal[l.id] ?? 0),
      }));

      const totalAssets = assetDetails.reduce((s, a) => s + a.value, 0);
      const totalLiabilities = liabilityDetails.reduce((s, l) => s + l.value, 0);

      return {
        month: monthKey,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        assetDetails,
        liabilityDetails,
      };
    });

    return NextResponse.json({
      months: snapshots,
      current: {
        totalAssets: allAssets.reduce((s, a) => s + a.currentValue, 0),
        totalLiabilities: allLiabilities.reduce(
          (s, l) => s + l.remainingPrincipal,
          0
        ),
      },
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "获取历史数据失败" },
      { status: 500 }
    );
  }
}
