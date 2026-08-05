import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, string> = {};

  checks.environment = process.env.NODE_ENV || "(not set)";

  // Check D1 connection
  try {
    await db.select({ value: sql`1` });
    checks.db_connection = "OK";
  } catch (err) {
    checks.db_connection = `FAILED: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }

  return NextResponse.json(checks);
}
