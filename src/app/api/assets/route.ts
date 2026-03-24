import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("active") === "true";

    if (id) {
      const asset = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, Number(id)), eq(assets.userId, user.id)));
      if (!asset.length) {
        return NextResponse.json({ error: "资产不存在" }, { status: 404 });
      }
      return NextResponse.json(asset[0]);
    }

    const conditions = [eq(assets.userId, user.id)];
    if (type) conditions.push(eq(assets.type, type as "real_estate" | "deposit" | "investment" | "income_source" | "other"));
    if (activeOnly) conditions.push(eq(assets.isActive, true));

    const result = await db
      .select()
      .from(assets)
      .where(and(...conditions));

    return NextResponse.json(result);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "获取资产列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const result = await db.insert(assets).values({
      userId: user.id,
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
    });

    const insertId = Number(result[0].insertId);
    const [newAsset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, insertId));

    return NextResponse.json(newAsset, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "创建资产失败" },
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
      .update(assets)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.userId, user.id)));

    const [updated] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id));

    if (!updated) {
      return NextResponse.json({ error: "资产不存在" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "更新资产失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    const refCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.assetId, id), eq(transactions.userId, user.id)));

    if (refCount[0].count > 0) {
      await db
        .update(assets)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(assets.id, id), eq(assets.userId, user.id)));
      return NextResponse.json({ success: true, softDeleted: true });
    }

    await db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "删除资产失败" },
      { status: 500 }
    );
  }
}
