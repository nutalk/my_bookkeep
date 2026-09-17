#!/bin/sh
set -e

echo "Waiting for MySQL to be ready..."
until bun -e "const c = require('mysql2/promise'); const conn = await c.createConnection({host:'${MYSQL_HOST}',port:${MYSQL_PORT:-3306},user:'${MYSQL_USER}',password:'${MYSQL_PASSWORD}'}); await conn.end();" 2>/dev/null; do
  echo "MySQL not ready, retrying in 2s..."
  sleep 2
done

echo "Running database migrations..."
# standalone 产物的 package.json 里没有 scripts 字段，直接运行脚本文件
bun run ./src/db/migrate.ts || echo "Migration skipped (tables may already exist)"

echo "Starting application..."
exec bun server.js
