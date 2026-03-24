import { NextResponse } from "next/server";
import { db } from "@/db";
import { liabilities, transactions } from "@/db/schema";
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
      const liability = await db
        .select()
        .from(liabilities)
        .where(and(eq(liabilities.id, Number(id)), eq(liabilities.userId, user.id)));
      if (!liability.length) {
        return NextResponse.json({ error: "负债不存在" }, { status: 404 });
      }
      return NextResponse.json(liability[0]);
    }

    const conditions = [eq(liabilities.userId, user.id)];
    if (type) conditions.push(eq(liabilities.type, type as "mortgage" | "car_loan" | "credit_card" | "personal_loan" | "other"));
    if (activeOnly) conditions.push(eq(liabilities.isActive, true));

    const result = await db
      .select()
      .from(liabilities)
      .where(and(...conditions));

    return NextResponse.json(result);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "获取负债列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const result = await db.insert(liabilities).values({
      userId: user.id,
      name: body.name,
      type: body.type,
      categoryId: body.categoryId ?? null,
      totalPrincipal: body.totalPrincipal,
      remainingPrincipal: body.remainingPrincipal ?? body.totalPrincipal,
      annualRate: body.annualRate ?? 0,
      monthlyPayment: body.monthlyPayment ?? 0,
      paymentDay: body.paymentDay ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: body.isActive ?? true,
      note: body.note ?? null,
    });

    const insertId = Number(result[0].insertId);
    const [newLiability] = await db
      .select()
      .from(liabilities)
      .where(eq(liabilities.id, insertId));

    return NextResponse.json(newLiability, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "创建负债失败" },
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
      .update(liabilities)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, user.id)));

    const [updated] = await db
      .select()
      .from(liabilities)
      .where(eq(liabilities.id, id));

    if (!updated) {
      return NextResponse.json({ error: "负债不存在" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "更新负债失败" },
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
      .where(and(eq(transactions.liabilityId, id), eq(transactions.userId, user.id)));

    if (refCount[0].count > 0) {
      await db
        .update(liabilities)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(liabilities.id, id), eq(liabilities.userId, user.id)));
      return NextResponse.json({ success: true, softDeleted: true });
    }

    await db
      .delete(liabilities)
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "删除负债失败" },
      { status: 500 }
    );
  }
}
