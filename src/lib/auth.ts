import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, lte } from "drizzle-orm";

const TOKEN_EXPIRY_DAYS = 30;

function generateToken(): string {
  // Web Crypto 随机 token（兼容 Cloudflare Workers）
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const result = await db
    .select({
      userId: sessions.userId,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!result.length) return null;

  const session = result[0];
  return { ...session.user, userId: session.userId };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function cleanupExpiredSessions() {
  const now = new Date();
  await db.delete(sessions).where(lte(sessions.expiresAt, now));
}
