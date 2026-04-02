"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatMoney, getAssetTypeLabel, getLiabilityTypeLabel } from "@/lib/utils";
import { PieChart } from "@/components/PieChart";
import { HorizontalBarChart } from "@/components/HorizontalBarChart";

interface Asset {
  id: number;
  name: string;
  type: string;
  currentValue: number;
  monthlyIncome: number;
  annualYield: number;
}

interface Liability {
  id: number;
  name: string;
  type: string;
  remainingPrincipal: number;
  annualRate: number;
  repaymentMethod: string;
  monthlyPayment: number;
  startDate: string | null;
  endDate: string | null;
}

const PIE_COLORS = [
  "#4ade80", "#60a5fa", "#f59e0b", "#a78bfa", "#f472b6",
  "#34d399", "#fbbf24", "#818cf8", "#fb923c", "#2dd4bf",
];

const BAR_COLORS = [
  "#4ade80", "#60a5fa", "#f59e0b", "#a78bfa", "#f472b6",
  "#34d399", "#fbbf24", "#818cf8",
];

function calcLiabilityMonthly(l: Liability) {
  const method = l.repaymentMethod || "equal_installment";
  const monthlyRate = l.annualRate / 100 / 12;
  if (method === "equal_installment") {
    const interest = l.remainingPrincipal * monthlyRate;
    return { total: l.monthlyPayment, interest, principal: l.monthlyPayment - interest };
  }
  if (method === "interest_only") {
    const interest = l.remainingPrincipal * monthlyRate;
    return { total: interest, interest, principal: 0 };
  }
  return { total: 0, interest: 0, principal: 0 };
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [user, setUser] = useState<{ nickname: string | null; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/liabilities").then((r) => r.json()),
    ]).then(([me, a, l]) => {
      if (me.user) setUser(me.user);
      setAssets(a);
      setLiabilities(l);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalAssets = useMemo(() => assets.reduce((s, a) => s + a.currentValue, 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((s, l) => s + l.remainingPrincipal, 0), [liabilities]);
  const netWorth = totalAssets - totalLiabilities;

  const monthlyIncome = useMemo(() => assets.reduce((s, a) => s + (a.monthlyIncome ?? 0), 0), [assets]);
  const monthlyExpense = useMemo(() => liabilities.reduce((s, l) => s + calcLiabilityMonthly(l).total, 0), [liabilities]);
  const monthlyInterest = useMemo(() => liabilities.reduce((s, l) => s + calcLiabilityMonthly(l).interest, 0), [liabilities]);
  const monthlyNetIncome = monthlyIncome - monthlyExpense;

  const assetPieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const label = getAssetTypeLabel(a.type);
      map.set(label, (map.get(label) ?? 0) + a.currentValue);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [assets]);

  const liabilityPieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of liabilities) {
      const label = getLiabilityTypeLabel(l.type);
      map.set(label, (map.get(label) ?? 0) + l.remainingPrincipal);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [liabilities]);

  const incomeByAsset = useMemo(() =>
    assets
      .filter((a) => (a.monthlyIncome ?? 0) > 0)
      .sort((a, b) => (b.monthlyIncome ?? 0) - (a.monthlyIncome ?? 0))
      .map((a, i) => ({
        label: a.name,
        principal: a.monthlyIncome ?? 0,
        interest: 0,
        color: BAR_COLORS[i % BAR_COLORS.length],
      })),
    [assets]
  );

  const expenseByLiability = useMemo(() =>
    liabilities
      .filter((l) => calcLiabilityMonthly(l).total > 0)
      .sort((a, b) => calcLiabilityMonthly(b).total - calcLiabilityMonthly(a).total)
      .map((l, i) => {
        const calc = calcLiabilityMonthly(l);
        return {
          label: l.name,
          principal: Math.max(0, calc.principal),
          interest: Math.max(0, calc.interest),
          color: BAR_COLORS[i % BAR_COLORS.length],
        };
      }),
    [liabilities]
  );

  if (loading) {
    return <div className="p-6 text-center text-neutral-500 py-20">加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">财务总览</h2>
          <p className="text-sm text-neutral-400">
            欢迎回来，{user?.nickname || user?.phone || ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/assets" className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
            资产管理
          </Link>
          <Link href="/liabilities" className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
            负债管理
          </Link>
          <Link href="/transactions" className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
            记一笔
          </Link>
        </div>
      </div>

      {/* 1. Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-400">总资产</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{formatMoney(totalAssets)}</p>
          <p className="text-xs text-neutral-500 mt-2">{assets.length} 项</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-400">总负债</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatMoney(totalLiabilities)}</p>
          <p className="text-xs text-neutral-500 mt-2">{liabilities.length} 项</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-400">净资产</p>
          <p className={`text-2xl font-bold mt-1 ${netWorth >= 0 ? "text-blue-400" : "text-red-400"}`}>
            {formatMoney(netWorth)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">资产 - 负债</p>
        </div>
      </div>

      {/* 2. Pie charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <PieChart data={assetPieData} title="资产构成" size={200} />
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <PieChart data={liabilityPieData} title="负债构成" size={200} />
        </div>
      </div>

      {/* 3. Next month projection */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">下月收入</p>
          <p className="text-lg font-bold text-green-400 mt-1">{formatMoney(monthlyIncome)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">下月支出</p>
          <p className="text-lg font-bold text-red-400 mt-1">{formatMoney(monthlyExpense)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">下月净收入</p>
          <p className={`text-lg font-bold mt-1 ${monthlyNetIncome >= 0 ? "text-blue-400" : "text-red-400"}`}>
            {formatMoney(monthlyNetIncome)}
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">下月利息支出</p>
          <p className="text-lg font-bold text-orange-400 mt-1">{formatMoney(monthlyInterest)}</p>
        </div>
      </div>

      {/* 4. Horizontal bar charts */}
      <div className="grid grid-cols-2 gap-4">
        <HorizontalBarChart data={incomeByAsset} title="收入来源" />
        <HorizontalBarChart data={expenseByLiability} title="支出明细" showBreakdown />
      </div>
    </div>
  );
}
