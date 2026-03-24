"use client";

import { useState, useEffect } from "react";
import { AssetForm } from "@/components/Forms";
import { formatMoney, getAssetTypeLabel } from "@/lib/utils";

interface Asset {
  id: number;
  name: string;
  type: string;
  currentValue: number;
  monthlyIncome: number;
  annualYield: number;
  isActive: boolean;
  note: string | null;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAssets = async () => {
    const res = await fetch("/api/assets");
    const data = await res.json();
    setAssets(data);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data) => {
        if (mounted) {
          setAssets(data);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这项资产吗？")) return;
    await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
    fetchAssets();
  };

  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalIncome = assets.reduce((s, a) => s + (a.monthlyIncome ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">资产管理</h2>
          <p className="text-sm text-neutral-400 mt-1">
            管理所有资产，追踪价值和现金流
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {showForm ? "收起" : "+ 添加资产"}
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <AssetForm
            onSuccess={() => {
              fetchAssets();
              setShowForm(false);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-sm text-neutral-400">资产总值</p>
          <p className="text-xl font-bold text-green-400 mt-1">
            {formatMoney(totalValue)}
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <p className="text-sm text-neutral-400">月总收入</p>
          <p className="text-xl font-bold text-blue-400 mt-1">
            {formatMoney(totalIncome)}
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
                当前价值
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                月收入
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                年化收益
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
                  colSpan={6}
                  className="text-center text-neutral-500 py-8 text-sm"
                >
                  加载中...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-neutral-500 py-8 text-sm"
                >
                  暂无资产记录，点击上方按钮添加
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30"
                >
                  <td className="px-4 py-3 text-sm text-white">{a.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-400">
                    {getAssetTypeLabel(a.type)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-400">
                    {formatMoney(a.currentValue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-400">
                    {formatMoney(a.monthlyIncome ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-400">
                    {(a.annualYield ?? 0).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => handleDelete(a.id)}
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
