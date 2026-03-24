"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney, formatDate } from "@/lib/utils";

interface Reconciliation {
  id: number;
  assetId: number | null;
  liabilityId: number | null;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  reconciliationDate: string;
  transactionId: number | null;
  note: string | null;
}

interface Asset {
  id: number;
  name: string;
  currentValue: number;
}

interface Liability {
  id: number;
  name: string;
  remainingPrincipal: number;
}

export default function ReconciliationsPage() {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    targetType: "asset",
    targetId: "",
    actualBalance: "",
    reconciliationDate: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    const [recRes, assetRes, liabilityRes] = await Promise.all([
      fetch("/api/reconciliations"),
      fetch("/api/assets?active=true"),
      fetch("/api/liabilities?active=true"),
    ]);
    setReconciliations(await recRes.json());
    setAssets(await assetRes.json());
    setLiabilities(await liabilityRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let expectedBalance = 0;
      if (form.targetType === "asset") {
        const asset = assets.find((a) => a.id === Number(form.targetId));
        expectedBalance = asset?.currentValue ?? 0;
      } else {
        const liability = liabilities.find(
          (l) => l.id === Number(form.targetId)
        );
        expectedBalance = liability?.remainingPrincipal ?? 0;
      }

      await fetch("/api/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: form.targetType === "asset" ? Number(form.targetId) : null,
          liabilityId:
            form.targetType === "liability" ? Number(form.targetId) : null,
          expectedBalance,
          actualBalance: Number(form.actualBalance),
          reconciliationDate: form.reconciliationDate,
          note: form.note,
        }),
      });

      setForm({
        targetType: "asset",
        targetId: "",
        actualBalance: "",
        reconciliationDate: new Date().toISOString().slice(0, 10),
        note: "",
      });
      setShowForm(false);
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">对账管理</h2>
          <p className="text-sm text-neutral-400 mt-1">
            核对余额，自动记录差额变动
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {showForm ? "收起" : "+ 新建对账"}
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  对账对象类型
                </label>
                <select
                  value={form.targetType}
                  onChange={(e) =>
                    setForm({ ...form, targetType: e.target.value, targetId: "" })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="asset">资产</option>
                  <option value="liability">负债</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  选择对象
                </label>
                <select
                  required
                  value={form.targetId}
                  onChange={(e) =>
                    setForm({ ...form, targetId: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">请选择</option>
                  {form.targetType === "asset"
                    ? assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (当前: {formatMoney(a.currentValue)})
                        </option>
                      ))
                    : liabilities.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} (当前: {formatMoney(l.remainingPrincipal)})
                        </option>
                      ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  实际余额 (元)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.actualBalance}
                  onChange={(e) =>
                    setForm({ ...form, actualBalance: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  对账日期
                </label>
                <input
                  type="date"
                  required
                  value={form.reconciliationDate}
                  onChange={(e) =>
                    setForm({ ...form, reconciliationDate: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">备注</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? "对账中..." : "确认对账"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left text-xs text-neutral-400 px-4 py-3 font-medium">
                日期
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                预期余额
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                实际余额
              </th>
              <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                差额
              </th>
              <th className="text-left text-xs text-neutral-400 px-4 py-3 font-medium">
                备注
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-neutral-500 py-8 text-sm"
                >
                  加载中...
                </td>
              </tr>
            ) : reconciliations.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-neutral-500 py-8 text-sm"
                >
                  暂无对账记录
                </td>
              </tr>
            ) : (
              reconciliations.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30"
                >
                  <td className="px-4 py-3 text-sm text-neutral-400">
                    {formatDate(r.reconciliationDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-400">
                    {formatMoney(r.expectedBalance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-white">
                    {formatMoney(r.actualBalance)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      r.difference === 0
                        ? "text-neutral-400"
                        : r.difference > 0
                          ? "text-green-400"
                          : "text-red-400"
                    }`}
                  >
                    {r.difference > 0 ? "+" : ""}
                    {formatMoney(r.difference)}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-400">
                    {r.note ?? "-"}
                    {r.transactionId && (
                      <span className="ml-2 text-xs bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded">
                        已自动记录
                      </span>
                    )}
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
