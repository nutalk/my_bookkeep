import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

interface PredictionMonth {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  cashFlow: number;
  assetIncome: number;
  liabilityPayment: number;
  assetDetails: { name: string; value: number; income: number }[];
  liabilityDetails: {
    name: string;
    remainingPrincipal: number;
    payment: number;
    interest: number;
    principal: number;
  }[];
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const months = Number(searchParams.get("months") || "12");

    const predictions: PredictionMonth[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const allAssets = await db
      .select()
      .from(assets)
      .where(and(eq(assets.isActive, true), eq(assets.userId, user.id)));

    const allLiabilities = await db
      .select()
      .from(liabilities)
      .where(and(eq(liabilities.isActive, true), eq(liabilities.userId, user.id)));

    const assetState = allAssets.map((a) => ({
      id: a.id,
      name: a.name,
      value: a.currentValue,
      monthlyIncome: a.monthlyIncome ?? 0,
      annualYield: a.annualYield ?? 0,
      type: a.type,
    }));

    const liabilityState = allLiabilities.map((l) => ({
      id: l.id,
      name: l.name,
      remainingPrincipal: l.remainingPrincipal,
      annualRate: l.annualRate,
      monthlyPayment: l.monthlyPayment,
      type: l.type,
    }));

    for (let i = 0; i < months; i++) {
      const targetMonth =
        currentMonth + i > 12
          ? ((currentMonth + i - 1) % 12) + 1
          : currentMonth + i;
      const targetYear =
        currentMonth + i > 12
          ? currentYear + Math.floor((currentMonth + i - 1) / 12)
          : currentYear;
      const monthStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

      const assetDetails = assetState.map((a) => {
        let income = a.monthlyIncome;
        if (a.type === "deposit" || a.type === "investment") {
          income = (a.value * a.annualYield) / 12;
        }
        return {
          name: a.name,
          value: a.value,
          income,
        };
      });

      const liabilityDetails = liabilityState.map((l) => {
        const monthlyInterest = (l.remainingPrincipal * l.annualRate) / 12;
        const principalPayment = Math.max(
          0,
          l.monthlyPayment - monthlyInterest
        );
        return {
          name: l.name,
          remainingPrincipal: l.remainingPrincipal,
          payment: l.monthlyPayment,
          interest: monthlyInterest,
          principal: principalPayment,
        };
      });

      const totalAssets = assetState.reduce((sum, a) => sum + a.value, 0);
      const totalLiabilities = liabilityState.reduce(
        (sum, l) => sum + l.remainingPrincipal,
        0
      );
      const assetIncome = assetDetails.reduce(
        (sum, a) => sum + a.income,
        0
      );
      const liabilityPayment = liabilityDetails.reduce(
        (sum, l) => sum + l.payment,
        0
      );

      predictions.push({
        month: monthStr,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        cashFlow: assetIncome - liabilityPayment,
        assetIncome,
        liabilityPayment,
        assetDetails,
        liabilityDetails,
      });

      for (let j = 0; j < assetState.length; j++) {
        const a = assetState[j];
        let income = a.monthlyIncome;
        if (a.type === "deposit" || a.type === "investment") {
          income = (a.value * a.annualYield) / 12;
        }
        if (a.type === "deposit" || a.type === "investment") {
          assetState[j] = { ...a, value: a.value + income };
        }
      }

      for (let j = 0; j < liabilityState.length; j++) {
        const l = liabilityState[j];
        const monthlyInterest =
          (l.remainingPrincipal * l.annualRate) / 12;
        const principalPayment = Math.max(
          0,
          l.monthlyPayment - monthlyInterest
        );
        const newPrincipal = Math.max(
          0,
          l.remainingPrincipal - principalPayment
        );
        liabilityState[j] = { ...l, remainingPrincipal: newPrincipal };
      }
    }

    return NextResponse.json({
      months: predictions,
      summary: {
        startNetWorth: predictions[0]
          ? predictions[0].totalAssets - predictions[0].totalLiabilities
          : 0,
        endNetWorth: predictions.length
          ? predictions[predictions.length - 1].netWorth
          : 0,
        averageMonthlyCashFlow:
          predictions.reduce((sum, p) => sum + p.cashFlow, 0) /
          (predictions.length || 1),
        totalAssetIncome: predictions.reduce(
          (sum, p) => sum + p.assetIncome,
          0
        ),
        totalLiabilityPayment: predictions.reduce(
          (sum, p) => sum + p.liabilityPayment,
          0
        ),
      },
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "生成现金流预测失败" },
      { status: 500 }
    );
  }
}
