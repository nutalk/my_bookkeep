export function formatMoney(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date | number): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getAssetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    real_estate: "房产",
    deposit: "存款",
    investment: "投资",
    income_source: "收入来源",
    other: "其他",
  };
  return map[type] ?? type;
}

export function getLiabilityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    mortgage: "房贷",
    car_loan: "车贷",
    credit_card: "信用卡",
    personal_loan: "个人贷款",
    other: "其他",
  };
  return map[type] ?? type;
}

export function getRepaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    equal_installment: "等额本息",
    interest_only: "按月付息到期还本",
    lump_sum: "一次性到期还本付息",
  };
  return map[method] ?? method;
}

export function getTransactionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    asset_value_change: "资产价值变动",
    asset_income: "资产收益",
    liability_repayment: "负债还款",
    liability_principal_change: "负债本金变动",
    expense: "支出",
    income: "收入",
    transfer: "转账",
    reconciliation: "对账调整",
  };
  return map[type] ?? type;
}
