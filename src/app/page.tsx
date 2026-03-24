import { db } from "@/db";
import { assets, liabilities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { formatMoney, getAssetTypeLabel, getLiabilityTypeLabel } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getDashboardData(userId: number) {
  const allAssets = await db
    .select()
    .from(assets)
    .where(and(eq(assets.isActive, true), eq(assets.userId, userId)));
  const allLiabilities = await db
    .select()
    .from(liabilities)
    .where(and(eq(liabilities.isActive, true), eq(liabilities.userId, userId)));

  const totalAssets = allAssets.reduce((s, a) => s + a.currentValue, 0);
  const totalLiabilities = allLiabilities.reduce(
    (s, l) => s + l.remainingPrincipal,
    0
  );
  const netWorth = totalAssets - totalLiabilities;
  const monthlyIncome = allAssets.reduce(
    (s, a) => s + (a.monthlyIncome ?? 0),
    0
  );
  const monthlyExpense = allLiabilities.reduce(
    (s, l) => s + l.monthlyPayment,
    0
  );

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    monthlyIncome,
    monthlyExpense,
    monthlyCashFlow: monthlyIncome - monthlyExpense,
    assets: allAssets,
    liabilities: allLiabilities,
  };
}

export default async function Home() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const data = await getDashboardData(user.id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">财务总览</h2>
        <p className="text-sm text-neutral-400">
          欢迎回来，{user.nickname || user.phone} — 实时数据
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-400">总资产</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {formatMoney(data.totalAssets)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            {data.assets.length} 项资产
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-400">总负债</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {formatMoney(data.totalLiabilities)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            {data.liabilities.length} 项负债
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-400">净资产</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              data.netWorth >= 0 ? "text-blue-400" : "text-red-400"
            }`}
          >
            {formatMoney(data.netWorth)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">资产 - 负债</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-400">月现金流能力</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              data.monthlyCashFlow >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatMoney(data.monthlyCashFlow)}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-neutral-500">
            <span>收入: {formatMoney(data.monthlyIncome)}</span>
            <span>支出: {formatMoney(data.monthlyExpense)}</span>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-center">
          <div className="flex gap-3">
            <Link
              href="/assets"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              管理资产
            </Link>
            <Link
              href="/liabilities"
              className="bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              管理负债
            </Link>
            <Link
              href="/transactions"
              className="bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              记账
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">资产明细</h3>
            <Link
              href="/assets"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-2">
            {data.assets.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center text-sm"
              >
                <div>
                  <span className="text-white">{a.name}</span>
                  <span className="text-neutral-500 ml-2 text-xs">
                    {getAssetTypeLabel(a.type)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-green-400">
                    {formatMoney(a.currentValue)}
                  </span>
                  {(a.monthlyIncome ?? 0) > 0 && (
                    <span className="text-neutral-500 ml-2 text-xs">
                      +{formatMoney(a.monthlyIncome!)}/月
                    </span>
                  )}
                </div>
              </div>
            ))}
            {data.assets.length === 0 && (
              <p className="text-neutral-500 text-sm">暂无资产记录</p>
            )}
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">负债明细</h3>
            <Link
              href="/liabilities"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-2">
            {data.liabilities.slice(0, 5).map((l) => (
              <div
                key={l.id}
                className="flex justify-between items-center text-sm"
              >
                <div>
                  <span className="text-white">{l.name}</span>
                  <span className="text-neutral-500 ml-2 text-xs">
                    {getLiabilityTypeLabel(l.type)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-red-400">
                    {formatMoney(l.remainingPrincipal)}
                  </span>
                  {l.monthlyPayment > 0 && (
                    <span className="text-neutral-500 ml-2 text-xs">
                      -{formatMoney(l.monthlyPayment)}/月
                    </span>
                  )}
                </div>
              </div>
            ))}
            {data.liabilities.length === 0 && (
              <p className="text-neutral-500 text-sm">暂无负债记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
