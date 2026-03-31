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
  const [autoEndDate, setAutoEndDate] = useState(true);

  const handleStartDateChange = (value: string) => {
    setForm((f) => ({ ...f, startDate: value }));
    if (value && autoEndDate) {
      const start = new Date(value);
      const months = Number(calcMonths) || 12;
      start.setMonth(start.getMonth() + months);
      const endStr = start.toISOString().slice(0, 10);
      setForm((f) => ({ ...f, startDate: value, endDate: endStr }));
    }
  };

  const handleCalcMonthsChange = (value: string) => {
    setCalcMonths(value);
    if (form.startDate && autoEndDate) {
      const start = new Date(form.startDate);
      const months = Number(value) || 12;
      start.setMonth(start.getMonth() + months);
      const endStr = start.toISOString().slice(0, 10);
      setForm((f) => ({ ...f, endDate: endStr }));
    }
  };

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
        setCalcMonths("12");
        setAutoEndDate(true);
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
              贷款期数 (月)
            </label>
            <input
              type="number"
              min="1"
              value={calcMonths}
              onChange={(e) => handleCalcMonthsChange(e.target.value)}
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
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-neutral-400">结束日期</label>
            <button
              type="button"
              onClick={() => setAutoEndDate(!autoEndDate)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                autoEndDate
                  ? "bg-blue-900/40 text-blue-400"
                  : "bg-neutral-800 text-neutral-500"
              }`}
            >
              {autoEndDate ? "自动" : "手动"}
            </button>
          </div>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => {
              setAutoEndDate(false);
              setForm({ ...form, endDate: e.target.value });
            }}
            readOnly={autoEndDate}
            className={`w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark] ${
              autoEndDate ? "opacity-60 cursor-not-allowed" : ""
            }`}
          />
          {autoEndDate && form.startDate && (
            <p className="text-xs text-neutral-500 mt-1">
              开始日期 + {calcMonths} 个月
            </p>
          )}
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
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<"asset" | "liability">("asset");
  const [assets, setAssets] = useState<{ id: number; name: string }[]>([]);
  const [liabilities, setLiabilities] = useState<{ id: number; name: string }[]>([]);
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

  useState(() => {
    fetch("/api/assets?active=true")
      .then((r) => r.json())
      .then((data) => setAssets(data.map((a: { id: number; name: string }) => ({ id: a.id, name: a.name }))))
      .catch(() => {});
    fetch("/api/liabilities?active=true")
      .then((r) => r.json())
      .then((data) => setLiabilities(data.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name }))))
      .catch(() => {});
  });

  const handleAccountTypeChange = (type: "asset" | "liability") => {
    setAccountType(type);
    setForm((f) => ({
      ...f,
      type: type === "asset" ? "income" : "liability_repayment",
      assetId: "",
      liabilityId: "",
      principalPart: "",
      interestPart: "",
    }));
  };

  const handleItemSelect = (id: string) => {
    if (accountType === "asset") {
      setForm((f) => ({ ...f, assetId: id, liabilityId: "" }));
    } else {
      setForm((f) => ({ ...f, liabilityId: id, assetId: "" }));
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        transactionDate: form.transactionDate,
        note: form.note || null,
      };
      if (accountType === "asset") {
        body.assetId = form.assetId ? Number(form.assetId) : null;
      } else {
        body.liabilityId = form.liabilityId ? Number(form.liabilityId) : null;
        body.principalPart = form.principalPart ? Number(form.principalPart) : 0;
        body.interestPart = form.interestPart ? Number(form.interestPart) : 0;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setForm({
          type: accountType === "asset" ? "income" : "liability_repayment",
          amount: "",
          principalPart: "",
          interestPart: "",
          description: "",
          transactionDate: new Date().toISOString().slice(0, 10),
          assetId: "",
          liabilityId: "",
          note: "",
        });
        setStep(1);
        onSuccess?.();
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const assetTypes = [
    { value: "income", label: "收入", color: "text-green-400" },
    { value: "expense", label: "支出", color: "text-red-400" },
  ];

  const liabilityTypes = [
    { value: "liability_repayment", label: "还款", color: "text-red-400" },
    { value: "liability_principal_change", label: "借款", color: "text-orange-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Step 1: Select account type and item */}
      <div className="space-y-3">
        <label className="block text-sm text-neutral-400">选择账户类型</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAccountTypeChange("asset")}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors border ${
              accountType === "asset"
                ? "bg-green-900/40 border-green-700 text-green-400"
                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            资产
          </button>
          <button
            type="button"
            onClick={() => handleAccountTypeChange("liability")}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors border ${
              accountType === "liability"
                ? "bg-red-900/40 border-red-700 text-red-400"
                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            负债
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm text-neutral-400 mb-1">
          选择{accountType === "asset" ? "资产" : "负债"}账户
        </label>
        <select
          value={accountType === "asset" ? form.assetId : form.liabilityId}
          onChange={(e) => handleItemSelect(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">请选择...</option>
          {(accountType === "asset" ? assets : liabilities).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Transaction details (only show after item selected) */}
      {step === 2 && (form.assetId || form.liabilityId) && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t border-neutral-800 pt-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">类型</label>
            <div className="grid grid-cols-2 gap-3">
              {(accountType === "asset" ? assetTypes : liabilityTypes).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
                    form.type === t.value
                      ? `bg-neutral-800 border-blue-500 ${t.color}`
                      : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
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
              placeholder="0.00"
            />
          </div>

          {accountType === "liability" && form.type === "liability_repayment" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">本金部分 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.principalPart}
                  onChange={(e) => setForm({ ...form, principalPart: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">利息部分 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.interestPart}
                  onChange={(e) => setForm({ ...form, interestPart: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-400 mb-1">描述</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="简要描述"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">日期</label>
            <input
              type="date"
              required
              value={form.transactionDate}
              onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

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
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "记录中..." : "确认记账"}
          </button>
        </form>
      )}
    </div>
  );
}
