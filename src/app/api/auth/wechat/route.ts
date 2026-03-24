import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "微信授权码不能为空" },
        { status: 400 }
      );
    }

    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: "微信登录未配置" },
        { status: 500 }
      );
    }

    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      return NextResponse.json(
        { error: "微信授权失败: " + (tokenData.errmsg || "未知错误") },
        { status: 400 }
      );
    }

    const { openid, access_token } = tokenData;

    const userInfoRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
    );
    const userInfo = await userInfoRes.json();

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.wechatOpenid, openid))
      .limit(1);

    let userId: number;

    if (existingUser.length) {
      userId = existingUser[0].id;
      await db
        .update(users)
        .set({
          nickname: userInfo.nickname || existingUser[0].nickname,
          avatarUrl: userInfo.headimgurl || existingUser[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      const result = await db.insert(users).values({
        phone: "wx_" + openid.slice(0, 11),
        wechatOpenid: openid,
        nickname: userInfo.nickname || "微信用户",
        avatarUrl: userInfo.headimgurl || null,
      });
      userId = Number(result[0].insertId);
    }

    const token = await createSession(userId);
    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userResult[0];

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "微信登录失败" },
      { status: 500 }
    );
  }
}
