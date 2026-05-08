import { client } from './client'

export async function initSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      locale TEXT NOT NULL DEFAULT 'fr',
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS income_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      name TEXT NOT NULL,
      parent_id INTEGER,
      is_default INTEGER NOT NULL DEFAULT 0,
      icon TEXT DEFAULT '💰',
      color TEXT DEFAULT '#6366f1',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS recurring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_due_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS income_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES income_categories(id),
      description TEXT NOT NULL,
      notes TEXT,
      is_payslip INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS payslip_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES income_transactions(id) ON DELETE CASCADE,
      gross_amount REAL NOT NULL,
      net_amount REAL NOT NULL,
      contributions REAL NOT NULL DEFAULT 0,
      bonuses REAL NOT NULL DEFAULT 0,
      employer_name TEXT,
      period_label TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS expense_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES expense_categories(id),
      description TEXT NOT NULL,
      notes TEXT,
      recurring_id INTEGER REFERENCES recurring_rules(id),
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS savings_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      frequency TEXT,
      next_due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS projection_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id),
      name TEXT NOT NULL,
      initial_amount REAL NOT NULL,
      monthly_contribution REAL NOT NULL,
      annual_rate_percent REAL NOT NULL,
      start_date TEXT NOT NULL,
      duration_years INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
  ]

  for (const sql of statements) {
    await client.execute(sql)
  }

  // Migrations: add new columns if they don't exist yet
  const migrations = [
    `ALTER TABLE income_transactions ADD COLUMN operation_type TEXT`,
    `ALTER TABLE income_transactions ADD COLUMN subcategory TEXT`,
    `ALTER TABLE income_transactions ADD COLUMN bank_reference TEXT`,
    `ALTER TABLE income_transactions ADD COLUMN bank_label TEXT`,
    `ALTER TABLE expense_transactions ADD COLUMN operation_type TEXT`,
    `ALTER TABLE expense_transactions ADD COLUMN subcategory TEXT`,
    `ALTER TABLE expense_transactions ADD COLUMN bank_reference TEXT`,
    `ALTER TABLE expense_transactions ADD COLUMN bank_label TEXT`,
  ]

  for (const migration of migrations) {
    try {
      await client.execute(migration)
    } catch {
      // Column already exists — ignore
    }
  }
}
