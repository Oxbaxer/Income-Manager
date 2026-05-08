import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { config } from './config'
import { initSchema } from './db/migrate'
import { authRoutes } from './routes/auth'
import { incomeRoutes } from './routes/income'
import { expenseRoutes } from './routes/expenses'
import { analyticsRoutes } from './routes/analytics'
import { recurringRoutes } from './routes/recurring'
import { goalsRoutes } from './routes/goals'
import { projectionsRoutes } from './routes/projections'
import { exportImportRoutes } from './routes/exportImport'
import { importCsvRoutes } from './routes/importCsv'
import { startCron } from './services/cron'

const fastify = Fastify({
  logger: config.nodeEnv === 'development' ? { level: 'info' } : false,
})

async function bootstrap() {
  // Init SQLite schema
  await initSchema()

  // Plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  })

  await fastify.register(jwt, {
    secret: config.jwt.secret,
  })

  // Routes
  await fastify.register(authRoutes)
  await fastify.register(incomeRoutes)
  await fastify.register(expenseRoutes)
  await fastify.register(analyticsRoutes)
  await fastify.register(recurringRoutes)
  await fastify.register(goalsRoutes)
  await fastify.register(projectionsRoutes)
  await fastify.register(exportImportRoutes)
  await fastify.register(importCsvRoutes)

  // Cron
  startCron()

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await fastify.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`Backend running on http://0.0.0.0:${config.port}`)
}

bootstrap().catch(err => {
  console.error(err)
  process.exit(1)
})
