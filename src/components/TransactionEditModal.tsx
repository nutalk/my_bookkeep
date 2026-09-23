"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import DatePicker from "./DatePicker";

export interface EditableTransaction {
  id: number;
  type: string;
  amount: number;
  principalPart?: number | null;
  interestPart?: number | null;
  description: string;
  transactionDate: string;
  note?: string | null;
}

const inputClass =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500";
const labelClass = "block text-sm text-neutral-400 mb-1";

/** 编辑单条交易明细。交易类型与所属账户不可改，避免影响账户余额方向。 */
export function TransactionEditModal({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: EditableTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    amount: "",
    principalPart: "",
    interestPart: "",
    description: "",
    transactionDate: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transaction) return;
    setError("");
    setForm({
      amount: String(transaction.amount),
      principalPart: transaction.principalPart
        ? String(transaction.principalPart)
        : "",
      interestPart: transaction.interestPart
        ? String(transaction.interestPart)
        : "",
      description: transaction.description,
      transactionDate: transaction.transactionDate.slice(0, 10),
      note: transaction.note ?? "",
    });
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transaction.id,
          amount: Number(form.amount),
          principalPart: form.principalPart
            ? Number(form.principalPart)
            : 0,
          interestPart: form.interestPart ? Number(form.interestPart) : 0,
          description: form.description,
          transactionDate: form.transactionDate,
          note: form.note || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "保存失败");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!transaction} title="编辑明细" onClose={onClose}>
      {error && (
        <div className="mb-3 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>金额 (元)</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>日期</label>
            <DatePicker
              required
              value={form.transactionDate}
              onChange={(v) => setForm({ ...form, transactionDate: v })}
              className="py-2"
            />
          </div>
        </div>
        {transaction?.type === "liability_repayment" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>本金部分 (元)</label>
              <input
                type="number"
                step="0.01"
                value={form.principalPart}
                onChange={(e) =>
                  setForm({ ...form, principalPart: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>利息部分 (元)</label>
              <input
                type="number"
                step="0.01"
                value={form.interestPart}
                onChange={(e) =>
                  setForm({ ...form, interestPart: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>
        )}
        <div>
          <label className={labelClass}>描述</label>
          <input
            type="text"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>备注</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存修改"}
        </button>
      </form>
    </Modal>
  );
}
