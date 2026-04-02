"use client";

import { useState, useEffect } from "react";
import { formatMoney, formatDate, getAssetTypeLabel, getLiabilityTypeLabel } from "@/lib/utils";

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
  type: string;
  currentValue: number;
}

interface Liability {
  id: number;
  name: string;
  type: string;
  remainingPrincipal: number;
}

interface SelectedItem {
  kind: "asset" | "liability";
  id: number;
  name: string;
  expectedBalance: number;
}

export default function ReconciliationsPage() {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    actualBalance: "",
    reconciliationDate: new Date().toISOString().slice(0, 10),
    note: "",
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/reconciliations").then((r) => r.json()),
      fetch("/api/assets?active=true").then((r) => r.json()),
      fetch("/api/liabilities?active=true").then((r) => r.json()),
    ]).then(([recs, a, l]) => {
      if (mounted) {
        setReconciliations(recs);
        setAssets(a);
        setLiabilities(l);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const isReconciled = (kind: "asset" | "liability", id: number) =>
    reconciliations.some((r) =>
      kind === "asset" ? r.assetId === id : r.liabilityId === id
    );

  const getLastReconciliation = (kind: "asset" | "liability", id: number) => {
    const recs = reconciliations.filter((r) =>
      kind === "asset" ? r.assetId === id : r.liabilityId === id
    );
    if (recs.length === 0) return null;
    return recs.sort(
      (a, b) =>
        new Date(b.reconciliationDate).getTime() -
        new Date(a.reconciliationDate).getTime()
    )[0];
  };

  const handleSelect = (kind: "asset" | "liability", item: Asset | Liability) => {
    const expectedBalance =
      kind === "asset"
        ? (item as Asset).currentValue
        : (item as Liability).remainingPrincipal;
    setSelected({
      kind,
      id: item.id,
      name: item.name,
      expectedBalance,
    });
    setForm({
      actualBalance: String(expectedBalance),
      reconciliationDate: new Date().toISOString().slice(0, 10),
      note: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await fetch("/api/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selected.kind === "asset" ? selected.id : null,
          liabilityId: selected.kind === "liability" ? selected.id : null,
          expectedBalance: selected.expectedBalance,
          actualBalance: Number(form.actualBalance),
          reconciliationDate: form.reconciliationDate,
          note: form.note,
        }),
      });
      setSelected(null);
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  // Group assets by type
  const assetGroups = (() => {
    const map = new Map<string, Asset[]>();
    for (const a of assets) {
      const label = getAssetTypeLabel(a.type);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(a);
    }
    return Array.from(map.entries());
  })();

  // Group liabilities by type
  const liabilityGroups = (() => {
    const map = new Map<string, Liability[]>();
    for (const l of liabilities) {
      const label = getLiabilityTypeLabel(l.type);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(l);
    }
    return Array.from(map.entries());
  })();

  if (loading) {
    return <div className="p-6 text-center text-neutral-500 py-20">加载中...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)]">
      <div className="px-6 pt-4 pb-3 shrink-0">
        <h2 className="text-2xl font-bold text-white">对账管理</h2>
        <p className="text-sm text-neutral-400 mt-0.5">
          选择左侧资产或负债进行余额核对
        </p>
      </div>

      <div className="flex flex-1 gap-4 px-6 pb-4 min-h-0">
        {/* Left: tree */}
        <div className="w-80 shrink-0 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl p-3">
          {/* Assets */}
          <div className="mb-4">
            <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider px-2 py-1.5">
              资产
            </div>
            {assetGroups.length === 0 ? (
              <p className="text-xs text-neutral-600 px-2 py-2">暂无资产</p>
            ) : (
              assetGroups.map(([typeLabel, items]) => (
                <div key={typeLabel}>
                  <div className="text-xs text-neutral-500 px-2 py-1 mt-1">
                    {typeLabel}
                  </div>
                  {items.map((a) => {
                    const reconciled = isReconciled("asset", a.id);
                    const last = getLastReconciliation("asset", a.id);
                    const isActive = selected?.kind === "asset" && selected.id === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleSelect("asset", a)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                          isActive
                            ? "bg-green-900/30 border border-green-700/40"
                            : "hover:bg-neutral-800 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {reconciled ? (
                            <span className="text-green-400 text-xs shrink-0">✓</span>
                          ) : (
                            <span className="w-3 shrink-0" />
                          )}
                          <span className="text-white truncate">{a.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-green-400 text-xs">
                            {formatMoney(a.currentValue)}
                          </span>
                          {last && (
                            <p className="text-[10px] text-neutral-600">
                              {formatDate(last.reconciliationDate)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Liabilities */}
          <div>
            <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider px-2 py-1.5">
              负债
            </div>
            {liabilityGroups.length === 0 ? (
              <p className="text-xs text-neutral-600 px-2 py-2">暂无负债</p>
            ) : (
              liabilityGroups.map(([typeLabel, items]) => (
                <div key={typeLabel}>
                  <div className="text-xs text-neutral-500 px-2 py-1 mt-1">
                    {typeLabel}
                  </div>
                  {items.map((l) => {
                    const reconciled = isReconciled("liability", l.id);
                    const last = getLastReconciliation("liability", l.id);
                    const isActive =
                      selected?.kind === "liability" && selected.id === l.id;
                    return (
                      <button
                        key={l.id}
                        onClick={() => handleSelect("liability", l)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                          isActive
                            ? "bg-red-900/30 border border-red-700/40"
                            : "hover:bg-neutral-800 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {reconciled ? (
                            <span className="text-green-400 text-xs shrink-0">✓</span>
                          ) : (
                            <span className="w-3 shrink-0" />
                          )}
                          <span className="text-white truncate">{l.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-red-400 text-xs">
                            {formatMoney(l.remainingPrincipal)}
                          </span>
                          {last && (
                            <p className="text-[10px] text-neutral-600">
                              {formatDate(last.reconciliationDate)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: form */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500 text-sm">
                从左侧选择一项资产或负债进行对账
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info */}
              <div
                className={`border rounded-xl p-5 ${
                  selected.kind === "asset"
                    ? "bg-neutral-900 border-green-800/30"
                    : "bg-neutral-900 border-red-800/30"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-neutral-400">
                      {selected.kind === "asset" ? "资产" : "负债"}
                    </p>
                    <p className="text-lg font-bold text-white mt-0.5">
                      {selected.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">系统余额</p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${
                        selected.kind === "asset" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatMoney(selected.expectedBalance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Difference preview */}
                {form.actualBalance && (
                  <div className="bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-neutral-400">差额</span>
                    <span
                      className={`text-sm font-bold ${
                        Number(form.actualBalance) - selected.expectedBalance === 0
                          ? "text-neutral-400"
                          : Number(form.actualBalance) - selected.expectedBalance > 0
                            ? "text-green-400"
                            : "text-red-400"
                      }`}
                    >
                      {Number(form.actualBalance) - selected.expectedBalance > 0
                        ? "+"
                        : ""}
                      {formatMoney(
                        Number(form.actualBalance) - selected.expectedBalance
                      )}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-neutral-400 mb-1">备注</label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="可选"
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

              {/* History for selected item */}
              {(() => {
                const history = reconciliations
                  .filter((r) =>
                    selected.kind === "asset"
                      ? r.assetId === selected.id
                      : r.liabilityId === selected.id
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.reconciliationDate).getTime() -
                      new Date(a.reconciliationDate).getTime()
                  );
                if (history.length === 0) return null;
                return (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-800">
                      <h4 className="text-sm font-medium text-white">历史对账记录</h4>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-800">
                          <th className="text-left text-xs text-neutral-400 px-4 py-2">日期</th>
                          <th className="text-right text-xs text-neutral-400 px-4 py-2">预期</th>
                          <th className="text-right text-xs text-neutral-400 px-4 py-2">实际</th>
                          <th className="text-right text-xs text-neutral-400 px-4 py-2">差额</th>
                          <th className="text-left text-xs text-neutral-400 px-4 py-2">备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((r) => (
                          <tr key={r.id} className="border-b border-neutral-800/50">
                            <td className="px-4 py-2 text-xs text-neutral-400">
                              {formatDate(r.reconciliationDate)}
                            </td>
                            <td className="px-4 py-2 text-xs text-right text-neutral-400">
                              {formatMoney(r.expectedBalance)}
                            </td>
                            <td className="px-4 py-2 text-xs text-right text-white">
                              {formatMoney(r.actualBalance)}
                            </td>
                            <td
                              className={`px-4 py-2 text-xs text-right font-medium ${
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
                            <td className="px-4 py-2 text-xs text-neutral-400">
                              {r.note || "-"}
                              {r.transactionId && (
                                <span className="ml-1 text-neutral-600">自动</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
