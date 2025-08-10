import { query } from './database.js';
import { initializeDatabase } from '../scripts/init-database.js';

let initPromise = null;
let isInitialized = false;

export async function ensureDatabaseInitialized() {
  if (isInitialized) {
    return true;
  }
  
  if (initPromise) {
    return await initPromise;
  }
  
  initPromise = (async () => {
    try {
      // Quick check if database is initialized by testing for profiles table
      await query('SELECT 1 FROM profiles LIMIT 1');
      console.log('✅ Database already initialized');
      isInitialized = true;
      return true;
    } catch (error) {
      // If table doesn't exist, initialize database
      if (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('table')) {
        console.log('🔧 Database not initialized, running setup...');
        await initializeDatabase();
        isInitialized = true;
        console.log('✅ Database initialization completed');
        return true;
      } else {
        // Other connection errors
        console.error('❌ Database connection error:', error.message);
        throw error;
      }
    }
  })();
  
  return await initPromise;
}