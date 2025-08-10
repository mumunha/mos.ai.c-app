import { initializeDatabase } from './init-database.js';

async function setupDatabase() {
  try {
    console.log('🔍 Environment check:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is required');
      process.exit(1);
    }
    
    // Check if already initialized
    const { query } = await import('../lib/database.js');
    try {
      await query('SELECT 1 FROM profiles LIMIT 1');
      console.log('✅ Database already initialized, skipping setup');
      return;
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('🔧 Database not initialized, running setup...');
        await initializeDatabase();
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    // Don't exit process in production, let the app try to start
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase().finally(() => {
    process.exit(0);
  });
}

export { setupDatabase };