import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env') })

const dbPath = process.env.DATABASE_PATH ?? './data/income-manager.db'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: `file:${dbPath}`,
  },
} satisfies Config
