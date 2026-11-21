const fs = require('fs')
const path = require('path')
const pool = require('../config/database')

// Create a table to track executed migrations
async function createMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

// Find and sort SQL migration files
function getMigrationFiles() {
  const migrationsDirectory = path.join(
    __dirname,
    '..',
    'migrations'
  )

  return fs
    .readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort()
}

// Get migrations that have already been executed
async function getExecutedMigrations(client) {
  const result = await client.query(
    'SELECT name FROM schema_migrations'
  )

  return new Set(
    result.rows.map((row) => row.name)
  )
}

// Execute a single migration safely
async function runMigration(filename) {
  const client = await pool.connect()

  try {
    const migrationsDirectory = path.join(
      __dirname,
      '..',
      'migrations'
    )

    const migrationPath = path.join(
      migrationsDirectory,
      filename
    )

    const sql = fs.readFileSync(
      migrationPath,
      'utf8'
    )

    await client.query('BEGIN')

    await client.query(sql)

    await client.query(
      `INSERT INTO schema_migrations (name)
       VALUES ($1)`,
      [filename]
    )

    await client.query('COMMIT')

    console.log(`Migration completed: ${filename}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Run all pending migrations
async function migrate() {
  try {
    await createMigrationTable()

    const migrationFiles = getMigrationFiles()
    const executedMigrations = await getExecutedMigrations(pool)

    for (const filename of migrationFiles) {
      if (executedMigrations.has(filename)) {
        console.log(`Already executed: ${filename}`)
        continue
      }

      await runMigration(filename)
    }

    console.log('Database migrations completed successfully.')
  } catch (error) {
    console.error('Migration failed:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

migrate()