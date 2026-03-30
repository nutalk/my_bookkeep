import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check environment variables
  checks.MYSQL_HOST = process.env.MYSQL_HOST || "(not set)";
  checks.MYSQL_PORT = process.env.MYSQL_PORT || "3306";
  checks.MYSQL_USER = process.env.MYSQL_USER || "(not set)";
  checks.MYSQL_DATABASE = process.env.MYSQL_DATABASE || "(not set)";
  checks.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ? "****" : "(empty)";

  // Check MySQL connection
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "family_balance_sheet",
    });

    // Check if tables exist
    const [rows] = await conn.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [process.env.MYSQL_DATABASE || "family_balance_sheet"]
    );
    checks.db_connection = "OK";
    checks.tables = JSON.stringify(
      (rows as { TABLE_NAME: string }[]).map((r) => r.TABLE_NAME)
    );

    await conn.end();
  } catch (err) {
    checks.db_connection = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json(checks);
}
