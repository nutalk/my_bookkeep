import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

let instance: Db | null = null;

function getInstance(): Db {
  if (!instance) {
    const { env } = getCloudflareContext();
    instance = drizzle(env.DB, { schema });
  }
  return instance;
}

/**
 * 惰性初始化的数据库对象。
 * - Cloudflare Workers (OpenNext): 首次访问时从 getCloudflareContext() 获取 D1 binding
 * - 本地开发 (next dev + initOpenNextCloudflareForDev): 同上
 * 现有 `import { db } from "@/db"` 的调用点无需任何改动。
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getInstance();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    return prop in getInstance();
  },
});

/** 从 insert 结果中提取自增主键 ID（适配 D1 的 meta.last_row_id） */
export function getInsertId(
  result:
    | { meta?: { last_row_id?: number | bigint | null } }
    | Array<{ insertId?: number | bigint | null }>,
): number {
  if (Array.isArray(result)) {
    return Number(result[0]?.insertId ?? 0);
  }
  return Number(result.meta?.last_row_id ?? 0);
}
