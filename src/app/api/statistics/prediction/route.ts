import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, liabilities } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const { searchParams } = new URL(request.url);
    const months = Number(searchParams.get("months") || "12");

    const predictions: PredictionMonth[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

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

    // 创建资产的可变副本用于预测
    const assetState = allAssets.map((a) => ({
      id: a.id,
      name: a.name,
      value: a.currentValue,
      monthlyIncome: a.monthlyIncome ?? 0,
      annualYield: a.annualYield ?? 0,
      type: a.type,
    }));

    // 创建负债的可变副本用于预测
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

      // 计算当月资产收入
      const assetDetails = assetState.map((a) => {
        // 投资类资产按年化收益率计算月收入
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

      // 计算当月负债还款
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

      // 更新下月状态
      // 资产增加收入
      for (let j = 0; j < assetState.length; j++) {
        const a = assetState[j];
        let income = a.monthlyIncome;
        if (a.type === "deposit" || a.type === "investment") {
          income = (a.value * a.annualYield) / 12;
        }
        // 收入来源的收入不增加资产价值（取出现金）
        // 存款和投资的利息自动再投入
        if (a.type === "deposit" || a.type === "investment") {
          assetState[j] = { ...a, value: a.value + income };
        }
      }

      // 负债减少本金
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
  } catch {
    return NextResponse.json(
      { error: "生成现金流预测失败" },
      { status: 500 }
    );
  }
}
