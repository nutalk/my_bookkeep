import { db, getInsertId } from "@/db";
import { transactions, assets, liabilities } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ActionResult {
  success: boolean;
  message: string;
  /** Current state of the affected record after the operation, for verification */
  verifyData?: string | null;
}

export type ActionName =
  | "create_transaction"
  | "create_asset"
  | "create_liability"
  | "update_asset"
  | "update_liability";

const SUPPORTED_NAMES = new Set([
  "create_transaction",
  "create_asset",
  "create_liability",
  "update_asset",
  "update_liability",
]);

const VALID_TRANSACTION_TYPES = [
  "asset_value_change",
  "asset_income",
  "liability_repayment",
  "liability_principal_change",
  "expense",
  "income",
  "transfer",
  "reconciliation",
] as const;

const VALID_ASSET_TYPES = [
  "real_estate",
  "deposit",
  "investment",
  "income_source",
  "other",
] as const;

const VALID_LIABILITY_TYPES = [
  "mortgage",
  "car_loan",
  "credit_card",
  "personal_loan",
  "other",
] as const;

const TYPE_LABELS: Record<string, string> = {
  expense: "支出",
  income: "收入",
  asset_value_change: "资产价值变动",
  asset_income: "资产收益",
  liability_repayment: "负债还款",
  liability_principal_change: "负债本金变动",
  transfer: "转账",
  reconciliation: "对账调整",
  real_estate: "房产",
  deposit: "存款",
  investment: "投资",
  income_source: "收入来源",
  other: "其他",
  mortgage: "房贷",
  car_loan: "车贷",
  credit_card: "信用卡",
  personal_loan: "个人贷款",
};

/**
 * Parse action blocks from AI response text.
 * Format: 【操作:action_name】\n{json}  or  [操作:action_name]\n{json}
 */
export function parseActions(text: string): {
  cleanText: string;
  actions: Array<{ name: ActionName; params: Record<string, unknown> }>;
} {
  const actions: Array<{ name: ActionName; params: Record<string, unknown> }> =
    [];
  const regex = /[【\[]操作:(\w+)[】\]]\s*(\{[\s\S]*?\})\s*/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawName = match[1];
    if (!SUPPORTED_NAMES.has(rawName)) {
      console.warn("[AI Action] Unsupported action name:", rawName);
      continue;
    }
    const name = rawName as ActionName;
    try {
      const params = JSON.parse(match[2]);
      actions.push({ name, params });
      console.log(`[AI Action] Parsed: ${name}`, params);
    } catch {
      console.warn("[AI Action] Failed to parse JSON params:", match[2]);
    }
  }

  const cleanText = text.replace(regex, "").trim();
  if (actions.length > 0) {
    console.log(`[AI Action] Total ${actions.length} action(s) found`);
  }

  return { cleanText, actions };
}

/** Execute a single action against the database for the given user */
export async function executeAction(
  userId: number,
  name: ActionName,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  console.log(`[AI Action] Executing: ${name}`, params);
  try {
    switch (name) {
      case "create_transaction":
        return await createTransaction(userId, params);
      case "create_asset":
        return await createAsset(userId, params);
      case "create_liability":
        return await createLiability(userId, params);
      case "update_asset":
        return await updateAsset(userId, params);
      case "update_liability":
        return await updateLiability(userId, params);
      default:
        return { success: false, message: `不支持的操作: ${name}` };
    }
  } catch (e) {
    console.error(`[AI Action] Execution failed for ${name}:`, e);
    return { success: false, message: `操作执行失败: ${(e as Error).message}` };
  }
}

// ───── create_transaction ─────

async function createTransaction(
  userId: number,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const {
    type,
    amount,
    description,
    transactionDate,
    categoryId,
    assetId,
    liabilityId,
    note,
  } = params as Record<string, unknown>;

  if (!type || !amount || !description) {
    return {
      success: false,
      message: "缺少必填参数: type, amount, description",
    };
  }
  if (
    !VALID_TRANSACTION_TYPES.includes(
      type as (typeof VALID_TRANSACTION_TYPES)[number],
    )
  ) {
    return { success: false, message: `无效的交易类型: ${type}` };
  }

  const result = await db.insert(transactions).values({
    userId,
    type: type as string,
    amount: Number(amount),
    description: String(description),
    categoryId: categoryId ? Number(categoryId) : null,
    assetId: assetId ? Number(assetId) : null,
    liabilityId: liabilityId ? Number(liabilityId) : null,
    transactionDate: transactionDate
      ? new Date(String(transactionDate))
      : new Date(),
    note: note ? String(note) : null,
  });

  const insertId = getInsertId(result);

  // Read back to verify
  const [saved] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, insertId));

  const typeLabel = TYPE_LABELS[saved.type] ?? saved.type;
  const dateStr = saved.transactionDate
    ? new Date(saved.transactionDate).toLocaleDateString("zh-CN")
    : "-";
  const verifyData = `[${dateStr}] ${typeLabel}: ¥${Number(saved.amount).toLocaleString("zh-CN")} — ${saved.description}`;

  return {
    success: true,
    message: `已创建交易记录 #${insertId}`,
    verifyData,
  };
}

// ───── create_asset ─────

async function createAsset(
  userId: number,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const { name, type, currentValue, monthlyIncome, annualYield, note } =
    params as Record<string, unknown>;

  if (!name || !type) {
    return { success: false, message: "缺少必填参数: name, type" };
  }
  if (!VALID_ASSET_TYPES.includes(type as (typeof VALID_ASSET_TYPES)[number])) {
    return {
      success: false,
      message: `无效的资产类型: ${type}，可选值: ${VALID_ASSET_TYPES.join(", ")}`,
    };
  }

  const val = currentValue !== undefined ? Number(currentValue) : 0;
  const result = await db.insert(assets).values({
    userId,
    name: String(name),
    type: type as string,
    currentValue: val,
    monthlyIncome: monthlyIncome !== undefined ? Number(monthlyIncome) : null,
    annualYield: annualYield !== undefined ? Number(annualYield) : null,
    note: note ? String(note) : null,
  });

  const insertId = getInsertId(result);

  // Read back to verify
  const [saved] = await db.select().from(assets).where(eq(assets.id, insertId));

  const typeLabel = TYPE_LABELS[saved.type] ?? saved.type;
  const monthlyStr = saved.monthlyIncome
    ? `, 月收入: ¥${saved.monthlyIncome}`
    : "";
  const yieldStr = saved.annualYield ? `, 年化: ${saved.annualYield}%` : "";
  const verifyData = `${saved.name} [${typeLabel}]: ¥${Number(saved.currentValue).toLocaleString("zh-CN")}${monthlyStr}${yieldStr}`;

  return {
    success: true,
    message: `已创建资产 #${insertId}`,
    verifyData,
  };
}

// ───── create_liability ─────

async function createLiability(
  userId: number,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const {
    name,
    type,
    totalPrincipal,
    annualRate,
    monthlyPayment,
    paymentDay,
    startDate,
    endDate,
    note,
  } = params as Record<string, unknown>;

  if (!name || !type || totalPrincipal === undefined) {
    return {
      success: false,
      message: "缺少必填参数: name, type, totalPrincipal",
    };
  }
  if (
    !VALID_LIABILITY_TYPES.includes(
      type as (typeof VALID_LIABILITY_TYPES)[number],
    )
  ) {
    return { success: false, message: `无效的负债类型: ${type}` };
  }

  const principal = Number(totalPrincipal);
  const result = await db.insert(liabilities).values({
    userId,
    name: String(name),
    type: type as string,
    totalPrincipal: principal,
    remainingPrincipal: principal,
    annualRate: annualRate !== undefined ? Number(annualRate) : 0,
    monthlyPayment: monthlyPayment !== undefined ? Number(monthlyPayment) : 0,
    paymentDay: paymentDay !== undefined ? Number(paymentDay) : null,
    startDate: startDate ? new Date(String(startDate)) : null,
    endDate: endDate ? new Date(String(endDate)) : null,
    note: note ? String(note) : null,
  });

  const insertId = getInsertId(result);

  // Read back to verify
  const [saved] = await db
    .select()
    .from(liabilities)
    .where(eq(liabilities.id, insertId));

  const typeLabel = TYPE_LABELS[saved.type] ?? saved.type;
  const verifyData = `${saved.name} [${typeLabel}]: 总额 ¥${Number(saved.totalPrincipal).toLocaleString("zh-CN")}, 剩余 ¥${Number(saved.remainingPrincipal).toLocaleString("zh-CN")}, 利率 ${saved.annualRate}%, 月供 ¥${saved.monthlyPayment}`;

  return {
    success: true,
    message: `已创建负债 #${insertId}`,
    verifyData,
  };
}

// ───── update_asset ─────

async function updateAsset(
  userId: number,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const { id, name, currentValue, monthlyIncome, annualYield, isActive, note } =
    params as Record<string, unknown>;

  if (id === undefined) {
    return { success: false, message: "缺少必填参数: id（资产ID）" };
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = String(name);
  if (currentValue !== undefined)
    updateData.currentValue = Number(currentValue);
  if (monthlyIncome !== undefined)
    updateData.monthlyIncome = Number(monthlyIncome);
  if (annualYield !== undefined) updateData.annualYield = Number(annualYield);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (note !== undefined) updateData.note = String(note);
  updateData.updatedAt = new Date();

  await db
    .update(assets)
    .set(updateData)
    .where(eq(assets.id, Number(id)));

  // Read back to verify
  const [saved] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, Number(id)));

  if (!saved) {
    return { success: false, message: `资产 #${id} 不存在` };
  }

  const typeLabel = TYPE_LABELS[saved.type] ?? saved.type;
  const monthlyStr = saved.monthlyIncome
    ? `, 月收入: ¥${saved.monthlyIncome}`
    : "";
  const activeStr = saved.isActive ? "启用" : "停用";
  const verifyData = `${saved.name} [${typeLabel}] (${activeStr}): ¥${Number(saved.currentValue).toLocaleString("zh-CN")}${monthlyStr}`;

  return {
    success: true,
    message: `已更新资产 #${id}`,
    verifyData,
  };
}

// ───── update_liability ─────

async function updateLiability(
  userId: number,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const {
    id,
    name,
    remainingPrincipal,
    annualRate,
    monthlyPayment,
    paymentDay,
    isActive,
    note,
  } = params as Record<string, unknown>;

  if (id === undefined) {
    return { success: false, message: "缺少必填参数: id（负债ID）" };
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = String(name);
  if (remainingPrincipal !== undefined)
    updateData.remainingPrincipal = Number(remainingPrincipal);
  if (annualRate !== undefined) updateData.annualRate = Number(annualRate);
  if (monthlyPayment !== undefined)
    updateData.monthlyPayment = Number(monthlyPayment);
  if (paymentDay !== undefined) updateData.paymentDay = Number(paymentDay);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (note !== undefined) updateData.note = String(note);
  updateData.updatedAt = new Date();

  await db
    .update(liabilities)
    .set(updateData)
    .where(eq(liabilities.id, Number(id)));

  // Read back to verify
  const [saved] = await db
    .select()
    .from(liabilities)
    .where(eq(liabilities.id, Number(id)));

  if (!saved) {
    return { success: false, message: `负债 #${id} 不存在` };
  }

  const typeLabel = TYPE_LABELS[saved.type] ?? saved.type;
  const activeStr = saved.isActive ? "还款中" : "已结清";
  const verifyData = `${saved.name} [${typeLabel}] (${activeStr}): 剩余 ¥${Number(saved.remainingPrincipal).toLocaleString("zh-CN")}, 月供 ¥${saved.monthlyPayment}`;

  return {
    success: true,
    message: `已更新负债 #${id}`,
    verifyData,
  };
}
