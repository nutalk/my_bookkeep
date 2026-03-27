"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssetForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "deposit",
    currentValue: "",
    monthlyIncome: "0",
    annualYield: "0",
    incomeFrequency: "monthly",
    incomeDay: "",
    note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          currentValue: Number(form.currentValue),
          monthlyIncome: Number(form.monthlyIncome),
          annualYield: Number(form.annualYield),
          incomeDay: form.incomeDay ? Number(form.incomeDay) : null,
        }),
      });
      if (res.ok) {
        setForm({
          name: "",
          type: "deposit",
          currentValue: "",
          monthlyIncome: "0",
          annualYield: "0",
          incomeFrequency: "monthly",
          incomeDay: "",
          note: "",
        });
        onSuccess?.();
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">名称</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="如: 工商银行存款"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">类型</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="real_estate">房产</option>
            <option value="deposit">存款</option>
            <option value="investment">投资</option>
            <option value="income_source">收入来源</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            当前价值 (元)
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={form.currentValue}
            onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            月收入 (元)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.monthlyIncome}
            onChange={(e) =>
              setForm({ ...form, monthlyIncome: e.target.value })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            年化收益率 (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.annualYield}
            onChange={(e) => setForm({ ...form, annualYield: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">收入频率</label>
          <select
            value={form.incomeFrequency}
            onChange={(e) =>
              setForm({ ...form, incomeFrequency: e.target.value })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="monthly">每月</option>
            <option value="quarterly">每季</option>
            <option value="yearly">每年</option>
            <option value="one_time">一次性</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">备注</label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          placeholder="可选备注"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "添加中..." : "添加资产"}
      </button>
    </form>
  );
}

function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  method: string,
  months?: number
): number {
  if (!principal || principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = months ?? 12;

  if (method === "equal_installment") {
    if (r === 0) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  if (method === "interest_only") {
    return principal * r;
  }
  // lump_sum: no monthly payment
  return 0;
}

export function LiabilityForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "mortgage",
    totalPrincipal: "",
    remainingPrincipal: "",
    annualRate: "",
    repaymentMethod: "equal_installment",
    monthlyPayment: "",
    paymentDay: "",
    startDate: "",
    endDate: "",
    note: "",
  });
  const [calcMonths, setCalcMonths] = useState("12");

  const handleAutoCalc = () => {
    const principal = Number(form.remainingPrincipal || form.totalPrincipal);
    const rate = Number(form.annualRate);
    if (!principal || principal <= 0) return;
    const months = Number(calcMonths) || 12;
    const payment = calcMonthlyPayment(principal, rate, form.repaymentMethod, months);
    setForm((f) => ({ ...f, monthlyPayment: String(Math.round(payment * 100) / 100) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalPrincipal: Number(form.totalPrincipal),
          remainingPrincipal: Number(form.remainingPrincipal),
          annualRate: Number(form.annualRate),
          monthlyPayment: Number(form.monthlyPayment),
          paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
        }),
      });
      if (res.ok) {
        setForm({
          name: "",
          type: "mortgage",
          totalPrincipal: "",
          remainingPrincipal: "",
          annualRate: "",
          repaymentMethod: "equal_installment",
          monthlyPayment: "",
          paymentDay: "",
          startDate: "",
          endDate: "",
          note: "",
        });
        onSuccess?.();
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">名称</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="如: 房贷"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">类型</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="mortgage">房贷</option>
            <option value="car_loan">车贷</option>
            <option value="credit_card">信用卡</option>
            <option value="personal_loan">个人贷款</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            总本金 (元)
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={form.totalPrincipal}
            onChange={(e) =>
              setForm({ ...form, totalPrincipal: e.target.value })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            剩余本金 (元)
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={form.remainingPrincipal}
            onChange={(e) =>
              setForm({ ...form, remainingPrincipal: e.target.value })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">还款方式</label>
        <select
          value={form.repaymentMethod}
          onChange={(e) =>
            setForm({ ...form, repaymentMethod: e.target.value })
          }
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="equal_installment">等额本息</option>
          <option value="interest_only">按月付息到期还本</option>
          <option value="lump_sum">一次性到期还本付息</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            年利率 (%)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.annualRate}
            onChange={(e) => setForm({ ...form, annualRate: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            {form.repaymentMethod === "lump_sum"
              ? "到期总还款 (元)"
              : "月还款 (元)"}
          </label>
          <input
            type="number"
            step="0.01"
            value={form.monthlyPayment}
            onChange={(e) =>
              setForm({ ...form, monthlyPayment: e.target.value })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder={form.repaymentMethod === "lump_sum" ? "到期时一次性支付" : ""}
            disabled={form.repaymentMethod === "lump_sum"}
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">还款日</label>
          <input
            type="number"
            min="1"
            max="31"
            value={form.paymentDay}
            onChange={(e) => setForm({ ...form, paymentDay: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="每月几号"
          />
        </div>
      </div>
      {form.repaymentMethod !== "lump_sum" && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-neutral-400 mb-1">
              计算期数 (月)
            </label>
            <input
              type="number"
              min="1"
              value={calcMonths}
              onChange={(e) => setCalcMonths(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleAutoCalc}
            className="bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
          >
            自动计算月供
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">开始日期</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">结束日期</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "添加中..." : "添加负债"}
      </button>
    </form>
  );
}

export function TransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "income",
    amount: "",
    principalPart: "",
    interestPart: "",
    description: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    assetId: "",
    liabilityId: "",
    note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          principalPart: form.principalPart ? Number(form.principalPart) : 0,
          interestPart: form.interestPart ? Number(form.interestPart) : 0,
          assetId: form.assetId ? Number(form.assetId) : null,
          liabilityId: form.liabilityId ? Number(form.liabilityId) : null,
        }),
      });
      if (res.ok) {
        setForm({
          type: "income",
          amount: "",
          principalPart: "",
          interestPart: "",
          description: "",
          transactionDate: new Date().toISOString().slice(0, 10),
          assetId: "",
          liabilityId: "",
          note: "",
        });
        onSuccess?.();
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">类型</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="income">收入</option>
            <option value="expense">支出</option>
            <option value="asset_value_change">资产价值变动</option>
            <option value="asset_income">资产收益</option>
            <option value="liability_repayment">负债还款</option>
            <option value="liability_principal_change">负债本金变动</option>
            <option value="transfer">转账</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">金额 (元)</label>
          <input
            type="number"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      {form.type === "liability_repayment" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              本金部分 (元)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.principalPart}
              onChange={(e) =>
                setForm({ ...form, principalPart: e.target.value })
              }
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              利息部分 (元)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.interestPart}
              onChange={(e) =>
                setForm({ ...form, interestPart: e.target.value })
              }
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">描述</label>
          <input
            type="text"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="账目描述"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">日期</label>
          <input
            type="date"
            required
            value={form.transactionDate}
            onChange={(e) =>
              setForm({ ...form, transactionDate: e.target.value })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "记录中..." : "记录账目"}
      </button>
    </form>
  );
}
