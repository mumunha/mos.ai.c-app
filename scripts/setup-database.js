import { initializeDatabase } from './init-database.js';

async function setupDatabase() {
  console.log('🔍 Environment check:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  await initializeDatabase();
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase().finally(() => {
    process.exit(0);
  });
}

export { setupDatabase };