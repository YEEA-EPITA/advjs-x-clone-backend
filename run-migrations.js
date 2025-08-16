// Simple migration runner for PostgreSQL .sql files in /migrations
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  const client = new Client({
    host: process.env.POSTGRESQL_HOST,
    port: process.env.POSTGRESQL_PORT,
    database: process.env.POSTGRESQL_DB,
    user: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
  });
  await client.connect();

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`Running migration: ${file}`);
    try {
      await client.query(sql);
      console.log(`Migration ${file} executed successfully.`);
    } catch (err) {
      console.error(`Migration ${file} failed:`, err.message);
    }
  }
  await client.end();
}

if (require.main === module) {
  runMigrations().catch(err => {
    console.error('Migration runner error:', err);
    process.exit(1);
  });
}
