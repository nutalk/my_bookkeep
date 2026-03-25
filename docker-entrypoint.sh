#!/bin/sh
set -e

echo "Waiting for MySQL to be ready..."
until bun -e "const c = require('mysql2/promise'); const conn = await c.createConnection({host:'${MYSQL_HOST}',port:${MYSQL_PORT:-3306},user:'${MYSQL_USER}',password:'${MYSQL_PASSWORD}'}); await conn.end();" 2>/dev/null; do
  echo "MySQL not ready, retrying in 2s..."
  sleep 2
done

echo "Running database migrations..."
bun db:migrate || echo "Migration skipped (tables may already exist)"

echo "Starting application..."
exec bun server.js
