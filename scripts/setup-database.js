import { initializeDatabase } from './init-database.js';

async function setupDatabase() {
  await initializeDatabase();
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase().finally(() => {
    process.exit(0);
  });
}

export { setupDatabase };