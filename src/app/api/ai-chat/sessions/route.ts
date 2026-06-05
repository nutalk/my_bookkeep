import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/ai-chat/sessions - list sessions
export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await db
      .select({
        id: chatSessions.id,
        title: chatSessions.title,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
      })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id))
      .orderBy(desc(chatSessions.updatedAt));

    return NextResponse.json(sessions);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取会话列表失败" }, { status: 500 });
  }
}

// POST /api/ai-chat/sessions - create a new session
export async function POST() {
  try {
    const user = await requireUser();
    const [result] = await db.insert(chatSessions).values({
      userId: user.id,
      title: "新对话",
    });

    const id = Number(result.insertId);
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, id));

    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "创建会话失败" }, { status: 500 });
  }
}
