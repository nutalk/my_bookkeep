import { db } from "./index";
import * as schema from "./schema";
import mysql from "mysql2/promise";

async function ensureTables() {
  const tables = [
    {
      name: "users",
      sql: `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        nickname VARCHAR(50),
        wechat_openid VARCHAR(100) UNIQUE,
        avatar_url VARCHAR(500),
        created_at DATETIME,
        updated_at DATETIME
      )`,
    },
    {
      name: "sessions",
      sql: `CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
    },
    {
      name: "categories",
      sql: `CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        parent_id INT,
        created_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
    },
    {
      name: "assets",
      sql: `CREATE TABLE IF NOT EXISTS assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(20) NOT NULL,
        category_id INT,
        current_value DOUBLE NOT NULL DEFAULT 0,
        monthly_income DOUBLE DEFAULT 0,
        annual_yield DOUBLE DEFAULT 0,
        income_frequency VARCHAR(20),
        income_day INT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        note TEXT,
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
    },
    {
      name: "liabilities",
      sql: `CREATE TABLE IF NOT EXISTS liabilities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(20) NOT NULL,
        category_id INT,
        total_principal DOUBLE NOT NULL,
        remaining_principal DOUBLE NOT NULL,
        annual_rate DOUBLE NOT NULL DEFAULT 0,
        repayment_method VARCHAR(30) NOT NULL DEFAULT 'equal_installment',
        monthly_payment DOUBLE NOT NULL DEFAULT 0,
        payment_day INT,
        start_date DATETIME,
        end_date DATETIME,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        note TEXT,
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
    },
    {
      name: "reconciliations",
      sql: `CREATE TABLE IF NOT EXISTS reconciliations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        asset_id INT,
        liability_id INT,
        expected_balance DOUBLE NOT NULL,
        actual_balance DOUBLE NOT NULL,
        difference DOUBLE NOT NULL,
        reconciliation_date DATETIME NOT NULL,
        transaction_id INT,
        note TEXT,
        created_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (liability_id) REFERENCES liabilities(id)
      )`,
    },
    {
      name: "transactions",
      sql: `CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(30) NOT NULL,
        category_id INT,
        asset_id INT,
        liability_id INT,
        amount DOUBLE NOT NULL,
        principal_part DOUBLE DEFAULT 0,
        interest_part DOUBLE DEFAULT 0,
        description VARCHAR(500) NOT NULL,
        transaction_date DATETIME NOT NULL,
        is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
        reconciliation_id INT,
        note TEXT,
        created_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (liability_id) REFERENCES liabilities(id),
        FOREIGN KEY (reconciliation_id) REFERENCES reconciliations(id)
      )`,
    },
    {
      name: "monthly_snapshots",
      sql: `CREATE TABLE IF NOT EXISTS monthly_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        month VARCHAR(7) NOT NULL,
        total_assets DOUBLE NOT NULL DEFAULT 0,
        total_liabilities DOUBLE NOT NULL DEFAULT 0,
        net_worth DOUBLE NOT NULL DEFAULT 0,
        monthly_cash_flow DOUBLE NOT NULL DEFAULT 0,
        asset_breakdown TEXT,
        liability_breakdown TEXT,
        created_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
    },
  ];

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "app",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "family_balance_sheet",
  });

  for (const table of tables) {
    try {
      await conn.execute(table.sql);
      console.log(`  Table ${table.name} OK`);
    } catch (err) {
      console.error(`  Table ${table.name} FAILED:`, err);
    }
  }

  await conn.end();
}

ensureTables()
  .then(() => {
    console.log("All tables ready.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Table creation failed:", err);
    process.exit(1);
  });
