import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const conditions = [eq(categories.userId, user.id)];
    if (type) conditions.push(eq(categories.type, type as "income" | "expense" | "asset" | "liability"));

    const result = await db
      .select()
      .from(categories)
      .where(and(...conditions));

    return NextResponse.json(result);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "获取分类列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const result = await db.insert(categories).values({
      userId: user.id,
      name: body.name,
      type: body.type,
      parentId: body.parentId ?? null,
    });

    const insertId = Number(result[0].insertId);
    const [newCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, insertId));

    return NextResponse.json(newCategory, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "创建分类失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { id, ...updates } = body;
    await db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

    const [updated] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    return NextResponse.json(updated);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "更新分类失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "删除分类失败" },
      { status: 500 }
    );
  }
}
