import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const query = db.select().from(categories);
    const result = type
      ? await query.where(eq(categories.type, type as "income" | "expense" | "asset" | "liability"))
      : await query;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "获取分类列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await db
      .insert(categories)
      .values({
        name: body.name,
        type: body.type,
        parentId: body.parentId ?? null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "创建分类失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const result = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json(
      { error: "更新分类失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    await db.delete(categories).where(eq(categories.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "删除分类失败" },
      { status: 500 }
    );
  }
}
