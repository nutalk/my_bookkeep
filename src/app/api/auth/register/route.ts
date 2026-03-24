import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password, nickname } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "手机号和密码不能为空" },
        { status: 400 }
      );
    }

    if (!/^1\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "请输入有效的手机号" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少6位" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existing.length) {
      return NextResponse.json(
        { error: "该手机号已注册" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.insert(users).values({
      phone,
      passwordHash,
      nickname: nickname || phone.slice(0, 3) + "****" + phone.slice(7),
    });

    const userId = Number(result[0].insertId);

    const token = await createSession(userId);
    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: userId,
        phone,
        nickname: nickname || phone.slice(0, 3) + "****" + phone.slice(7),
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "注册失败" },
      { status: 500 }
    );
  }
}
