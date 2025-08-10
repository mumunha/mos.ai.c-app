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
    
    console.log('📄 Reading mosaic entities migration file...');
    const migrationPath = path.join(process.cwd(), 'database/migrations/007_mosaic_entities.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running mosaic entities migration...');
    await query(migration);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tables = ['entities', 'entity_relationships', 'entity_sources', 'mosaic_projections'];
    
    for (const tableName of tables) {
      const result = await query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      if (result.rows.length > 0) {
        console.log(`✅ Table '${tableName}' created successfully`);
      } else {
        console.log(`❌ Table '${tableName}' was not created`);
      }
    }
    
    // Show some stats
    const vectorExtension = await query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);
    
    if (vectorExtension.rows.length > 0) {
      console.log('✅ Vector extension is enabled');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();