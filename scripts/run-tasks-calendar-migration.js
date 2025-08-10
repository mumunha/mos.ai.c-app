#!/usr/bin/env node

import { query } from '../lib/database.js';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key] = value;
    }
  });
} catch (error) {
  console.log('📝 No .env.local file found, using system environment variables');
}

async function runTasksCalendarMigration() {
  try {
    console.log('🔗 Testing database connection...');
    
    // Test connection first
    await query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    console.log('📄 Reading tasks and calendar migration file...');
    const migrationPath = path.join(process.cwd(), 'database/migrations/006_tasks_and_calendar.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running tasks and calendar migration...');
    await query(migration);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const result = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('tasks', 'calendar_events', 'task_dependencies')
      ORDER BY table_name
    `);
    
    console.log(`✅ Created tables: ${result.rows.map(row => row.table_name).join(', ')}`);
    
    // Check indexes were created
    const indexResult = await query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename IN ('tasks', 'calendar_events', 'task_dependencies')
      ORDER BY indexname
    `);
    
    console.log(`✅ Created indexes: ${indexResult.rows.length} indexes`);
    
    console.log('🎉 Tasks and Calendar features are now ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runTasksCalendarMigration();