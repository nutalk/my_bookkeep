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
import { eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const [
      assetRows,
      liabilityRows,
      transactionRows,
      categoryRows,
      reconciliationRows,
      snapshotRows,
      chatSessionRows,
    ] = await Promise.all([
      db.select().from(assets).where(eq(assets.userId, user.id)),
      db.select().from(liabilities).where(eq(liabilities.userId, user.id)),
      db.select().from(transactions).where(eq(transactions.userId, user.id)),
      db.select().from(categories).where(eq(categories.userId, user.id)),
      db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.userId, user.id)),
      db
        .select()
        .from(monthlySnapshots)
        .where(eq(monthlySnapshots.userId, user.id)),
      db.select().from(chatSessions).where(eq(chatSessions.userId, user.id)),
    ]);

    const sessionIds = chatSessionRows.map((s) => s.id);
    const chatMessageRows =
      sessionIds.length > 0
        ? await db
            .select()
            .from(chatMessages)
            .where(inArray(chatMessages.sessionId, sessionIds))
        : [];

    const exportData = {
      version: "1.0",
      source: "my_bookkeep",
      exportedAt: new Date().toISOString(),
      data: {
        assets: assetRows,
        liabilities: liabilityRows,
        transactions: transactionRows,
        categories: categoryRows,
        reconciliations: reconciliationRows,
        monthlySnapshots: snapshotRows,
        chatSessions: chatSessionRows,
        chatMessages: chatMessageRows,
      },
      counts: {
        assets: assetRows.length,
        liabilities: liabilityRows.length,
        transactions: transactionRows.length,
        categories: categoryRows.length,
        reconciliations: reconciliationRows.length,
        monthlySnapshots: snapshotRows.length,
        chatSessions: chatSessionRows.length,
        chatMessages: chatMessageRows.length,
      },
    };

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="my_bookkeep_export_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "导出数据失败" }, { status: 500 });
  }
}
