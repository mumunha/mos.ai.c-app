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

async function runMigration() {
  try {
    console.log('🔗 Testing database connection...');
    
    // Test connection first
    await query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'database/migrations/005_processing_logs.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running processing logs migration...');
    await query(migration);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify table was created
    const result = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'processing_logs'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ processing_logs table created successfully');
    } else {
      console.log('❌ processing_logs table not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runMigration();