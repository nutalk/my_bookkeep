import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
import { and, eq, inArray, ne } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    // Require explicit confirmation
    if (body.confirm !== "确认清空所有数据") {
      return NextResponse.json({ error: "请输入确认文本" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get("session_token")?.value;

    // 按「子表在前」的顺序删除即可满足外键约束，
    // 不要再用 SET FOREIGN_KEY_CHECKS 开关去绕过（连接池不保证落在同一条连接上）。
    await db.delete(transactions).where(eq(transactions.userId, user.id));
    await db
      .delete(reconciliations)
      .where(eq(reconciliations.userId, user.id));
    await db
      .delete(monthlySnapshots)
      .where(eq(monthlySnapshots.userId, user.id));

    // chat_messages 没有 user_id，先按当前用户的会话取出 id 再删
    const sessionIds = (
      await db
        .select({ id: chatSessions.id })
        .from(chatSessions)
        .where(eq(chatSessions.userId, user.id))
    ).map((s) => s.id);
    if (sessionIds.length > 0) {
      await db
        .delete(chatMessages)
        .where(inArray(chatMessages.sessionId, sessionIds));
    }
    await db.delete(chatSessions).where(eq(chatSessions.userId, user.id));

    await db.delete(liabilities).where(eq(liabilities.userId, user.id));
    await db.delete(assets).where(eq(assets.userId, user.id));
    await db.delete(categories).where(eq(categories.userId, user.id));

    // 保留当前登录会话，否则清空后会被立刻登出，导致「清空 → 导入」流程中断
    await db
      .delete(sessions)
      .where(
        currentToken
          ? and(eq(sessions.userId, user.id), ne(sessions.token, currentToken))
          : eq(sessions.userId, user.id),
      );

    return NextResponse.json({
      success: true,
      message: "所有数据已清空（已保留当前登录状态）",
    });
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
