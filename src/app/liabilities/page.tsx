"use client";

import { useState, useEffect } from "react";
import { LiabilityForm } from "@/components/Forms";
import { formatMoney, getLiabilityTypeLabel } from "@/lib/utils";

interface Liability {
  id: number;
  name: string;
  type: string;
  totalPrincipal: number;
  remainingPrincipal: number;
  annualRate: number;
  monthlyPayment: number;
  isActive: boolean;
  note: string | null;
}

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetch("/api/liabilities")
      .then((r) => r.json())
      .then((data) => {
        if (mounted) {
          setLiabilities(data);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const fetchLiabilities = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这项负债吗？")) return;
    await fetch(`/api/liabilities?id=${id}`, { method: "DELETE" });
    fetchLiabilities();
  };

  const totalRemaining = liabilities.reduce(
    (s, l) => s + l.remainingPrincipal,
    0
  );
  const totalPayment = liabilities.reduce((s, l) => s + l.monthlyPayment, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">负债管理</h2>
          <p className="text-sm text-neutral-400 mt-1">
            管理所有负债，追踪还款和利息
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {showForm ? "收起" : "+ 添加负债"}
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <LiabilityForm
            onSuccess={() => {
              fetchLiabilities();
              setShowForm(false);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-sm text-neutral-400">负债总额</p>
          <p className="text-xl font-bold text-red-400 mt-1">
            {formatMoney(totalRemaining)}
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-sm text-neutral-400">月总还款</p>
          <p className="text-xl font-bold text-orange-400 mt-1">
            {formatMoney(totalPayment)}
          </p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left text-xs text-neutral-400 px-4 py-3 font-medium">
                名称
              </th>
              <th className="text-left text-xs text-neutral-400 px-4 py-3 font-medium">
                类型
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                总本金
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                剩余本金
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                月还款
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                年利率
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-neutral-500 py-8 text-sm"
                >
                  加载中...
                </td>
              </tr>
            ) : liabilities.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-neutral-500 py-8 text-sm"
                >
                  暂无负债记录，点击上方按钮添加
                </td>
              </tr>
            ) : (
              liabilities.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30"
                >
                  <td className="px-4 py-3 text-sm text-white">{l.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-400">
                    {getLiabilityTypeLabel(l.type)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-400">
                    {formatMoney(l.totalPrincipal)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-400">
                    {formatMoney(l.remainingPrincipal)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-orange-400">
                    {formatMoney(l.monthlyPayment)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-400">
                    {l.annualRate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
