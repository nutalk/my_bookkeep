import { NextResponse } from "next/server";
import { db } from "@/db";
import { liabilities, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("active") === "true";

    if (id) {
      const liability = await db
        .select()
        .from(liabilities)
        .where(eq(liabilities.id, Number(id)));
      if (!liability.length) {
        return NextResponse.json({ error: "负债不存在" }, { status: 404 });
      }
      return NextResponse.json(liability[0]);
    }

    let query = db.select().from(liabilities);
    const conditions = [];
    if (type) conditions.push(eq(liabilities.type, type as "mortgage" | "car_loan" | "credit_card" | "personal_loan" | "other"));
    if (activeOnly) conditions.push(eq(liabilities.isActive, true));

    const result = conditions.length
      ? await query.where(and(...conditions))
      : await query;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "获取负债列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await db
      .insert(liabilities)
      .values({
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
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "创建负债失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const result = await db
      .update(liabilities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(liabilities.id, id))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "负债不存在" }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json(
      { error: "更新负债失败" },
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
      .where(eq(transactions.liabilityId, id));

    if (refCount[0].count > 0) {
      await db
        .update(liabilities)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(liabilities.id, id));
      return NextResponse.json({ success: true, softDeleted: true });
    }

    await db.delete(liabilities).where(eq(liabilities.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "删除负债失败" },
      { status: 500 }
    );
  }
}
