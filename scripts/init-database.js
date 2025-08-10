#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join } from 'path';
import { query, getPool } from '../lib/database.js';

// ASCII Art Logo
const logo = `
 ███╗   ███╗ ██████╗ ███████╗      █████╗ ██╗      ██████╗
 ████╗ ████║██╔═══██╗██╔════╝     ██╔══██╗██║     ██╔════╝
 ██╔████╔██║██║   ██║███████╗     ███████║██║     ██║     
 ██║╚██╔╝██║██║   ██║╚════██║     ██╔══██║██║     ██║     
 ██║ ╚═╝ ██║╚██████╔╝███████║ ██╗ ██║  ██║██║ ██╗ ╚██████╗
 ╚═╝     ╚═╝ ╚═════╝ ╚══════╝ ╚═╝ ╚═╝  ╚═╝╚═╝ ╚═╝  ╚═════╝
                                                           
     Memory • Organization • Synthesis • AI • Companion
`;

function showProgress(current, total, message) {
  const percentage = Math.floor((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 4)) + '░'.repeat(25 - Math.floor(percentage / 4));
  console.log(`[${bar}] ${percentage}% - ${message}`);
}

async function initializeDatabase() {
  console.clear();
  console.log('\x1b[36m%s\x1b[0m', logo);
  console.log('\x1b[33m%s\x1b[0m', '🚀 Initializing MOS•AI•C Database...\n');
  
  const steps = [
    'Testing database connection',
    'Checking extensions',
    'Running schema migrations',
    'Creating indexes and performance optimizations',
    'Setting up triggers and functions', 
    'Configuring security policies',
    'Setting up processing logs',
    'Creating tasks and calendar tables',
    'Setting up entity relationships',
    'Verifying installation'
  ];
  
  try {
    // Step 1: Test connection
    showProgress(1, steps.length, steps[0]);
    await query('SELECT NOW()');
    console.log('✓ Database connection successful');
    
    // Step 2: Check extensions
    showProgress(2, steps.length, steps[1]);
    const extensions = await query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm', 'pgcrypto')
    `);
    
    const installedExts = extensions.rows.map(row => row.extname);
    console.log('✓ Available extensions:', installedExts.join(', '));
    
    if (!installedExts.includes('vector')) {
      console.log('\x1b[33m%s\x1b[0m', '⚠ pgvector extension not found. Ensure it\'s installed in your PostgreSQL instance.');
    }
    
    // Steps 3-9: Execute migration files
    const migrationFiles = [
      { file: '001_initial_schema.sql', step: 3 },
      { file: '002_indexes_and_performance.sql', step: 4 },
      { file: '003_triggers_and_functions.sql', step: 5 },
      { file: '004_rls_policies.sql', step: 6 },
      { file: '005_processing_logs.sql', step: 7 },
      { file: '006_tasks_and_calendar.sql', step: 8 },
      { file: '007_mosaic_entities.sql', step: 9 }
    ];
    
    for (const migration of migrationFiles) {
      showProgress(migration.step, steps.length, steps[migration.step - 1]);
      
      try {
        const migrationPath = join(process.cwd(), 'database', 'migrations', migration.file);
        const migrationSQL = await readFile(migrationPath, 'utf8');
        
        // Execute the entire migration file at once
        // Remove comments but preserve the SQL structure
        const cleanSQL = migrationSQL
          .split('\n')
          .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
          .join('\n');
        
        if (cleanSQL.trim()) {
          await query(cleanSQL);
        }
        
        console.log(`✓ ${migration.file} completed`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠ ${migration.file} - Objects already exist (skipping)`);
        } else {
          console.error(`❌ Error in ${migration.file}:`, error.message);
          throw error;
        }
      }
    }
    
    // Step 10: Verify installation
    showProgress(10, steps.length, steps[9]);
    
    const tables = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map(row => row.table_name);
    console.log('✓ Database tables created:', tableNames.join(', '));
    
    // Test vector functionality if available
    if (installedExts.includes('vector')) {
      try {
        await query("SELECT vector_dims('[1,2,3]'::vector)");
        console.log('✓ Vector extension working correctly');
      } catch (error) {
        console.log('⚠ Vector extension test failed:', error.message);
      }
    }
    
    console.log('\n\x1b[32m%s\x1b[0m', '🎉 Database initialization completed successfully!');
    console.log('\x1b[36m%s\x1b[0m', '   Your MOS•AI•C database is ready to use.');
    console.log('\x1b[90m%s\x1b[0m', '   Run "npm run dev" to start the application.');
    
  } catch (error) {
    console.log('\n\x1b[31m%s\x1b[0m', '❌ Database initialization failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().finally(() => {
    process.exit(0);
  });
}

export { initializeDatabase };