/**
 * 交易流水 → 账户余额 的重放逻辑（纯函数，前后端共用）。
 *
 * 账户余额以流水为准：资产 `currentValue` / 负债 `remainingPrincipal`
 * 等于按时间顺序重放该账户全部流水的结果（期初为 0）。
 *
 * 之前这些余额和流水是两套独立数据，一旦不一致（历史导入、手工改余额等），
 * 明细里的「余额」列就会算出错误结果。统一在这里重放可以保证口径一致。
 */

export interface LedgerTx {
  type: string;
  amount: number;
  /** 负债还款中的本金部分，缺省时整笔金额都算本金 */
  principalPart?: number | null;
}

/** 单笔负债交易对剩余本金的变动（正数表示负债增加） */
export function liabilityDelta(t: LedgerTx): number {
  switch (t.type) {
    case "liability_principal_change":
    case "reconciliation":
      return t.amount;
    case "liability_repayment": {
      const principal =
        (t.principalPart ?? 0) > 0 ? (t.principalPart as number) : t.amount;
      return -principal;
    }
    default:
      return 0;
  }
}

/**
 * 单笔资产交易对当前价值的变动。
 * 返回 `null` 表示该笔是绝对值设定（asset_value_change），直接覆盖余额。
 */
export function assetDelta(t: LedgerTx): number | null {
  switch (t.type) {
    case "income":
    case "asset_income":
    case "reconciliation":
      return t.amount;
    case "expense":
      return -t.amount;
    case "asset_value_change":
      return null;
    default:
      return 0;
  }
}

export function applyLiabilityTx(balance: number, t: LedgerTx): number {
  return balance + liabilityDelta(t);
}

export function applyAssetTx(balance: number, t: LedgerTx): number {
  const delta = assetDelta(t);
  return delta === null ? t.amount : balance + delta;
}

/**
 * 按「从旧到新」的顺序重放，返回每一笔之后的余额。
 * 传入顺序必须是时间升序，否则 asset_value_change 这类绝对值交易会算错。
 */
export function runningLiabilityBalances(txs: LedgerTx[]): number[] {
  const balances: number[] = [];
  let balance = 0;
  for (const t of txs) {
    balance = applyLiabilityTx(balance, t);
    balances.push(balance);
  }
  return balances;
}

export function runningAssetBalances(txs: LedgerTx[]): number[] {
  const balances: number[] = [];
  let balance = 0;
  for (const t of txs) {
    balance = applyAssetTx(balance, t);
    balances.push(balance);
  }
  return balances;
}

/** 重放整段流水，返回最终余额 */
export function replayLiability(txs: LedgerTx[]): number {
  return txs.reduce(applyLiabilityTx, 0);
}

export function replayAsset(txs: LedgerTx[]): number {
  return txs.reduce(applyAssetTx, 0);
}
