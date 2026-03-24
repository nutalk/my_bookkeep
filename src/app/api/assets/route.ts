import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("active") === "true";

    if (id) {
      const asset = await db
        .select()
        .from(assets)
        .where(eq(assets.id, Number(id)));
      if (!asset.length) {
        return NextResponse.json({ error: "资产不存在" }, { status: 404 });
      }
      return NextResponse.json(asset[0]);
    }

    let query = db.select().from(assets);
    const conditions = [];
    if (type) conditions.push(eq(assets.type, type as "real_estate" | "deposit" | "investment" | "income_source" | "other"));
    if (activeOnly) conditions.push(eq(assets.isActive, true));

    const result = conditions.length
      ? await query.where(and(...conditions))
      : await query;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "获取资产列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await db
      .insert(assets)
      .values({
        name: body.name,
        type: body.type,
        categoryId: body.categoryId ?? null,
        currentValue: body.currentValue ?? 0,
        monthlyIncome: body.monthlyIncome ?? 0,
        annualYield: body.annualYield ?? 0,
        incomeFrequency: body.incomeFrequency ?? null,
        incomeDay: body.incomeDay ?? null,
        isActive: body.isActive ?? true,
        note: body.note ?? null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "创建资产失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const result = await db
      .update(assets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "资产不存在" }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json(
      { error: "更新资产失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    const refCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.assetId, id));

    if (refCount[0].count > 0) {
      await db
        .update(assets)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(assets.id, id));
      return NextResponse.json({ success: true, softDeleted: true });
    }

    await db.delete(assets).where(eq(assets.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "删除资产失败" },
      { status: 500 }
    );
  }
}
