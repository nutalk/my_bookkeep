import { db } from "./index";
import { assets, liabilities, transactions, users } from "./schema";
import { and, asc, eq } from "drizzle-orm";
import { replayAsset, replayLiability } from "../lib/ledger";

/**
 * 以流水为准重算某个用户的全部账户余额（幂等，可重复执行）。
 *
 * 历史数据里 `remaining_principal` / `current_value` 与流水不一致
 * （早期 OpenBookkeeping 导入只把负数明细计入剩余本金，正数变动被漏掉），
 * 会让明细里的「余额」列算错。这里按时间顺序重放流水覆盖存储余额。
 *
 * 只处理「至少有一条流水」的账户，避免把没有流水但手工填了余额的账户清零。
 */
export async function reconcileUserBalances(userId: number) {
  const liabilityRows = await db
    .select({ id: liabilities.id, remainingPrincipal: liabilities.remainingPrincipal })
    .from(liabilities)
    .where(eq(liabilities.userId, userId));

  for (const l of liabilityRows) {
    const txs = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        principalPart: transactions.principalPart,
      })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.liabilityId, l.id)),
      )
      .orderBy(asc(transactions.transactionDate), asc(transactions.id));
    if (txs.length === 0) continue;
    const remaining = replayLiability(txs);
    if (Math.abs(remaining - l.remainingPrincipal) < 0.001) continue;
    await db
      .update(liabilities)
      .set({ remainingPrincipal: remaining })
      .where(eq(liabilities.id, l.id));
  }

  const assetRows = await db
    .select({ id: assets.id, currentValue: assets.currentValue })
    .from(assets)
    .where(eq(assets.userId, userId));

  for (const a of assetRows) {
    const txs = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        principalPart: transactions.principalPart,
      })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.assetId, a.id)),
      )
      .orderBy(asc(transactions.transactionDate), asc(transactions.id));
    if (txs.length === 0) continue;
    const currentValue = replayAsset(txs);
    if (Math.abs(currentValue - a.currentValue) < 0.001) continue;
    await db
      .update(assets)
      .set({ currentValue })
      .where(eq(assets.id, a.id));
  }
}

/** 重算所有用户的账户余额 */
export async function reconcileAllUserBalances() {
  const rows = await db.select({ id: users.id }).from(users);
  for (const u of rows) {
    await reconcileUserBalances(u.id);
  }
}
