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
    repaymentMethod: string;
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

    const isYieldAsset = (a: { type: string }) =>
      a.type === "deposit" || a.type === "investment";

    // 年化收益率是百分数（如 3.5 表示 3.5%），需除以 100
    const assetIncomeOf = (a: {
      type: string;
      value: number;
      annualYield: number;
      monthlyIncome: number;
    }) =>
      isYieldAsset(a)
        ? (a.value * a.annualYield) / 100 / 12
        : a.monthlyIncome;

    const assetState = allAssets.map((a) => ({
      id: a.id,
      name: a.name,
      value: a.currentValue,
      monthlyIncome: a.monthlyIncome ?? 0,
      annualYield: a.annualYield ?? 0,
      type: a.type,
    }));

    const liabilityState = allLiabilities.map((l) => {
      let maturityMonth = 0;
      if (l.endDate) {
        const endDate = new Date(l.endDate);
        maturityMonth =
          (endDate.getFullYear() - currentYear) * 12 +
          (endDate.getMonth() + 1 - currentMonth);
      }
      return {
        id: l.id,
        name: l.name,
        remainingPrincipal: l.remainingPrincipal,
        totalPrincipal: l.totalPrincipal,
        annualRate: l.annualRate,
        monthlyPayment: l.monthlyPayment,
        type: l.type,
        repaymentMethod: l.repaymentMethod || "equal_installment",
        maturityMonth,
      };
    });

    // 累计净结余：现金收入（工资/租金）减去全部支出后的余钱。
    // 单列一项，保证净值只随真实现金结余 + 还本增长，而不是把工资直接炒成资产市值。
    let cashSurplus = 0;

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

      const assetDetails = assetState.map((a) => ({
        name: a.name,
        value: a.value,
        income: assetIncomeOf(a),
      }));

      const liabilityDetails = liabilityState.map((l) => {
        // 年利率是百分比值（如 3.5 表示 3.5%），需除以 100
        const monthlyRate = l.annualRate / 100 / 12;
        const monthlyInterest = l.remainingPrincipal * monthlyRate;

        let payment = 0;
        let principalPayment = 0;

        if (l.repaymentMethod === "equal_installment") {
          payment = l.monthlyPayment;
          principalPayment = Math.max(0, l.monthlyPayment - monthlyInterest);
        } else if (l.repaymentMethod === "interest_only") {
          payment = l.monthlyPayment > 0 ? l.monthlyPayment : monthlyInterest;
          principalPayment = 0;
        } else if (l.repaymentMethod === "lump_sum") {
          if (l.maturityMonth === i) {
            payment = l.remainingPrincipal + monthlyInterest;
            principalPayment = l.remainingPrincipal;
          } else {
            payment = 0;
            principalPayment = 0;
          }
        } else {
          // 其他还款方式：优先使用用户设置的月还款
          payment = l.monthlyPayment > 0 ? l.monthlyPayment : 0;
          principalPayment = Math.max(0, payment - monthlyInterest);
        }

        return {
          name: l.name,
          remainingPrincipal: l.remainingPrincipal,
          payment,
          interest: monthlyInterest,
          principal: principalPayment,
          repaymentMethod: l.repaymentMethod,
        };
      });

      // 现金收入 = 工资/租金等；存款/投资的收益是复利留在资产里的，不算现金
      const cashIncome = assetState.reduce(
        (sum, a) => sum + (isYieldAsset(a) ? 0 : a.monthlyIncome),
        0
      );

      const totalAssets =
        assetState.reduce((sum, a) => sum + a.value, 0) + cashSurplus;
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
        assetDetails: [
          ...assetDetails,
          { name: "现金结余", value: cashSurplus, income: 0 },
        ],
        liabilityDetails,
      });

      // Update asset state for next month — 只有存款/投资按年化收益复利，
      // 工资/租金是现金流，不再直接加进资产市值
      for (let j = 0; j < assetState.length; j++) {
        const a = assetState[j];
        if (isYieldAsset(a)) {
          assetState[j] = { ...a, value: a.value + assetIncomeOf(a) };
        }
      }

      // 现金结余 = 本月现金收入 − 本月全部支出（含利息、生活费、还本）
      cashSurplus += cashIncome - liabilityPayment;

      // Update liability state for next month
      for (let j = 0; j < liabilityState.length; j++) {
        const l = liabilityState[j];
        const monthlyRate = l.annualRate / 100 / 12;
        const monthlyInterest = l.remainingPrincipal * monthlyRate;
        let principalPayment = 0;

        if (l.repaymentMethod === "equal_installment") {
          principalPayment = Math.max(0, l.monthlyPayment - monthlyInterest);
        } else if (l.repaymentMethod === "interest_only") {
          principalPayment = 0;
        } else if (l.repaymentMethod === "lump_sum") {
          if (l.maturityMonth === i) {
            principalPayment = l.remainingPrincipal;
          }
        } else {
          const payment = l.monthlyPayment > 0 ? l.monthlyPayment : 0;
          principalPayment = Math.max(0, payment - monthlyInterest);
        }

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
