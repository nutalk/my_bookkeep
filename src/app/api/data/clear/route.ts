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
  sessions,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { confirm: string };

    // Require explicit confirmation
    if (body.confirm !== "确认清空所有数据") {
      return NextResponse.json({ error: "请输入确认文本" }, { status: 400 });
    }

    // Delete all data for the current user
    // (SQLite/D1 默认不启用外键约束，需显式删除 chat_messages，
    //  不能依赖 chat_sessions 的级联删除)
    await db.delete(transactions).where(eq(transactions.userId, user.id));
    await db
      .delete(reconciliations)
      .where(eq(reconciliations.userId, user.id));
    await db
      .delete(monthlySnapshots)
      .where(eq(monthlySnapshots.userId, user.id));

    const userSessions = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id));
    if (userSessions.length > 0) {
      await db
        .delete(chatMessages)
        .where(
          inArray(
            chatMessages.sessionId,
            userSessions.map((s) => s.id),
          ),
        );
    }
    await db.delete(chatSessions).where(eq(chatSessions.userId, user.id));
    await db.delete(liabilities).where(eq(liabilities.userId, user.id));
    await db.delete(assets).where(eq(assets.userId, user.id));
    await db.delete(categories).where(eq(categories.userId, user.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    return NextResponse.json({ success: true, message: "所有数据已清空" });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("Clear data error:", e);
    return NextResponse.json(
      { error: `清空数据失败: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
