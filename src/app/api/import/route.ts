import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  assets,
  liabilities,
  transactions,
  categories,
  reconciliations,
  monthlySnapshots,
  chatSessions,
  chatMessages,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

/**
 * 数据备份导入接口
 *
 * 接收本应用「数据管理 → 导出」生成的 JSON 备份文件（source: "my_bookkeep"），
 * 将全部数据完整恢复到当前登录用户下。
 *
 * 由于各表 ID 在数据库中全局共享（多用户同表），导入时会做 ID 重映射，
 * 保持表间外键关系（categoryId / assetId / liabilityId / reconciliationId /
 * transactionId / sessionId / parentId）不变。
 */

interface ExportRow {
  id: number;
  [key: string]: unknown;
}

interface ImportPayload {
  version?: string;
  source?: string;
  data?: {
    assets?: ExportRow[];
    liabilities?: ExportRow[];
    transactions?: ExportRow[];
    categories?: ExportRow[];
    reconciliations?: ExportRow[];
    monthlySnapshots?: ExportRow[];
    chatSessions?: ExportRow[];
    chatMessages?: ExportRow[];
  };
}

interface TxLike {
  insert(table: any): {
    values(values: any): Promise<[{ insertId: number | bigint }, unknown]>;
  };
  update(table: any): {
    set(values: any): { where(cond: any): Promise<unknown> };
  };
}

function asRows(value: unknown): ExportRow[] {
  return Array.isArray(value) ? (value as ExportRow[]) : [];
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function remapId(
  map: Map<number, number>,
  oldId: unknown,
): number | null {
  if (oldId == null) return null;
  const mapped = map.get(Number(oldId));
  return mapped ?? null;
}

function pickDates(
  row: ExportRow,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "") out[key] = new Date(String(v));
  }
  return out;
}

async function insertWithMap(
  tx: TxLike,
  table: any,
  rows: ExportRow[],
  toValues: (row: ExportRow) => Record<string, unknown>,
): Promise<Map<number, number>> {
  const idMap = new Map<number, number>();
  for (const row of rows) {
    const result = await tx.insert(table).values(toValues(row));
    idMap.set(row.id, Number(result[0].insertId));
  }
  return idMap;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // 检查用户是否已有数据，避免重复导入
    const [existing] = await Promise.all([
      db
        .select({ id: assets.id })
        .from(assets)
        .where(eq(assets.userId, user.id))
        .limit(1),
      db
        .select({ id: liabilities.id })
        .from(liabilities)
        .where(eq(liabilities.userId, user.id))
        .limit(1),
      db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.userId, user.id))
        .limit(1),
      db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.userId, user.id))
        .limit(1),
    ]);
    if (existing.some(Boolean)) {
      return NextResponse.json(
        {
          error:
            "当前用户已有数据，请先到「账号设置 → 数据管理」页面清空数据后再导入。",
        },
        { status: 409 },
      );
    }

    const body: ImportPayload = await request.json();
    const { version, data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        {
          error:
            "无效的备份文件，缺少 data 字段。请使用本应用「数据管理 → 导出」生成的 JSON 文件。",
        },
        { status: 400 },
      );
    }
    if (version && version !== "1.0") {
      return NextResponse.json(
        { error: `不支持的备份文件版本: ${version}` },
        { status: 400 },
      );
    }

    const categoryRows = asRows(data.categories);
    const assetRows = asRows(data.assets);
    const liabilityRows = asRows(data.liabilities);
    const reconciliationRows = asRows(data.reconciliations);
    const transactionRows = asRows(data.transactions);
    const snapshotRows = asRows(data.monthlySnapshots);
    const chatSessionRows = asRows(data.chatSessions);
    const chatMessageRows = asRows(data.chatMessages);

    let insertedMessageCount = 0;

    await db.transaction(async (tx) => {
      // 1. 分类（parentId 自引用，先置空后回填）
      const categoryIdMap = await insertWithMap(
        tx,
        categories,
        categoryRows,
        (row) => ({
          userId: user.id,
          name: String(row.name),
          type: String(row.type),
          parentId: null,
          ...pickDates(row, ["createdAt"]),
        }),
      );
      for (const row of categoryRows) {
        const newId = categoryIdMap.get(row.id);
        const newParentId = remapId(categoryIdMap, row.parentId);
        if (newId != null && newParentId != null) {
          await tx
            .update(categories)
            .set({ parentId: newParentId })
            .where(eq(categories.id, newId));
        }
      }

      // 2. 资产
      const assetIdMap = await insertWithMap(
        tx,
        assets,
        assetRows,
        (row) => ({
          userId: user.id,
          name: String(row.name),
          type: String(row.type),
          categoryId: remapId(categoryIdMap, row.categoryId),
          currentValue: toNumber(row.currentValue) ?? 0,
          monthlyIncome: toNumber(row.monthlyIncome) ?? 0,
          annualYield: toNumber(row.annualYield) ?? 0,
          incomeFrequency:
            row.incomeFrequency != null ? String(row.incomeFrequency) : null,
          incomeDay: toNumber(row.incomeDay),
          isActive: Boolean(row.isActive ?? true),
          note: row.note != null ? String(row.note) : null,
          ...pickDates(row, ["createdAt", "updatedAt"]),
        }),
      );

      // 3. 负债
      const liabilityIdMap = await insertWithMap(
        tx,
        liabilities,
        liabilityRows,
        (row) => ({
          userId: user.id,
          name: String(row.name),
          type: String(row.type),
          categoryId: remapId(categoryIdMap, row.categoryId),
          totalPrincipal: toNumber(row.totalPrincipal) ?? 0,
          remainingPrincipal: toNumber(row.remainingPrincipal) ?? 0,
          annualRate: toNumber(row.annualRate) ?? 0,
          repaymentMethod: String(row.repaymentMethod),
          monthlyPayment: toNumber(row.monthlyPayment) ?? 0,
          paymentDay: toNumber(row.paymentDay),
          startDate:
            row.startDate != null ? new Date(String(row.startDate)) : null,
          endDate: row.endDate != null ? new Date(String(row.endDate)) : null,
          isActive: Boolean(row.isActive ?? true),
          note: row.note != null ? String(row.note) : null,
          ...pickDates(row, ["createdAt", "updatedAt"]),
        }),
      );

      // 4. 对账记录（transactionId 先置空，待交易导入后回填）
      const reconciliationIdMap = await insertWithMap(
        tx,
        reconciliations,
        reconciliationRows,
        (row) => ({
          userId: user.id,
          assetId: remapId(assetIdMap, row.assetId),
          liabilityId: remapId(liabilityIdMap, row.liabilityId),
          expectedBalance: toNumber(row.expectedBalance) ?? 0,
          actualBalance: toNumber(row.actualBalance) ?? 0,
          difference: toNumber(row.difference) ?? 0,
          reconciliationDate: new Date(String(row.reconciliationDate)),
          transactionId: null,
          note: row.note != null ? String(row.note) : null,
          ...pickDates(row, ["createdAt"]),
        }),
      );

      // 5. 交易记录
      const transactionIdMap = await insertWithMap(
        tx,
        transactions,
        transactionRows,
        (row) => ({
          userId: user.id,
          type: String(row.type),
          categoryId: remapId(categoryIdMap, row.categoryId),
          assetId: remapId(assetIdMap, row.assetId),
          liabilityId: remapId(liabilityIdMap, row.liabilityId),
          amount: toNumber(row.amount) ?? 0,
          principalPart: toNumber(row.principalPart) ?? 0,
          interestPart: toNumber(row.interestPart) ?? 0,
          description: String(row.description),
          transactionDate: new Date(String(row.transactionDate)),
          isAutoGenerated: Boolean(row.isAutoGenerated ?? false),
          reconciliationId: remapId(reconciliationIdMap, row.reconciliationId),
          note: row.note != null ? String(row.note) : null,
          ...pickDates(row, ["createdAt"]),
        }),
      );

      // 回填对账记录的 transactionId（循环引用）
      for (const row of reconciliationRows) {
        const newReconciliationId = reconciliationIdMap.get(row.id);
        const newTransactionId = remapId(transactionIdMap, row.transactionId);
        if (newReconciliationId != null && newTransactionId != null) {
          await tx
            .update(reconciliations)
            .set({ transactionId: newTransactionId })
            .where(eq(reconciliations.id, newReconciliationId));
        }
      }

      // 6. 月度快照
      await insertWithMap(
        tx,
        monthlySnapshots,
        snapshotRows,
        (row) => ({
          userId: user.id,
          month: String(row.month),
          totalAssets: toNumber(row.totalAssets) ?? 0,
          totalLiabilities: toNumber(row.totalLiabilities) ?? 0,
          netWorth: toNumber(row.netWorth) ?? 0,
          monthlyCashFlow: toNumber(row.monthlyCashFlow) ?? 0,
          assetBreakdown:
            row.assetBreakdown != null ? String(row.assetBreakdown) : null,
          liabilityBreakdown:
            row.liabilityBreakdown != null
              ? String(row.liabilityBreakdown)
              : null,
          ...pickDates(row, ["createdAt"]),
        }),
      );

      // 7. AI 聊天会话
      const sessionIdMap = await insertWithMap(
        tx,
        chatSessions,
        chatSessionRows,
        (row) => ({
          userId: user.id,
          title: String(row.title),
          ...pickDates(row, ["createdAt", "updatedAt"]),
        }),
      );

      // 8. AI 聊天消息（仅导入会话存在且可映射的消息）
      const sessionIdSet = new Set(sessionIdMap.keys());
      const messageRows = chatMessageRows.filter((row) => {
        const sessionId = toNumber(row.sessionId);
        return sessionId != null && sessionIdSet.has(sessionId);
      });
      insertedMessageCount = messageRows.length;
      await insertWithMap(
        tx,
        chatMessages,
        messageRows,
        (row) => ({
          sessionId: sessionIdMap.get(Number(row.sessionId))!,
          role: String(row.role),
          content: String(row.content),
          ...pickDates(row, ["createdAt"]),
        }),
      );
    });

    const stats = {
      categories: categoryRows.length,
      assets: assetRows.length,
      liabilities: liabilityRows.length,
      transactions: transactionRows.length,
      reconciliations: reconciliationRows.length,
      monthlySnapshots: snapshotRows.length,
      chatSessions: chatSessionRows.length,
      chatMessages: insertedMessageCount,
    };

    return NextResponse.json({
      success: true,
      message: `导入完成！共恢复 ${stats.categories} 个分类、${stats.assets} 个资产、${stats.liabilities} 个负债、${stats.transactions} 条交易记录、${stats.reconciliations} 条对账、${stats.monthlySnapshots} 个月度快照、${stats.chatSessions} 个聊天会话。`,
      stats,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("Import error:", e);
    return NextResponse.json(
      { error: "导入失败: " + ((e as Error).message || "未知错误") },
      { status: 500 },
    );
  }
}
