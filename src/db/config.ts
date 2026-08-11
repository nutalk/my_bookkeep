/**
 * MySQL 连接公共配置。
 *
 * 默认启用 TLS（不校验证书，兼容 TiDB Cloud、AWS RDS 等云数据库）。
 * 若目标 MySQL 不支持 TLS（如某些免费托管），设置环境变量 `MYSQL_SSL=false` 禁用。
 */
export function mysqlSsl():
  | { rejectUnauthorized: boolean }
  | undefined {
  if (process.env.MYSQL_SSL === "false") return undefined;
  return { rejectUnauthorized: false };
}
