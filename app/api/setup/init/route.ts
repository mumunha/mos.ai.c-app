import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '../../../../scripts/init-database.js';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manual database initialization requested');
    
    // Check if already initialized
    try {
      await query('SELECT 1 FROM profiles LIMIT 1');
      return NextResponse.json({ 
        message: 'Database already initialized',
        status: 'already_exists'
      });
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('🚀 Initializing database...');
        await initializeDatabase();
        return NextResponse.json({ 
          message: 'Database initialized successfully',
          status: 'initialized'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Database initialization failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check database status
    const result = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    const isInitialized = tables.includes('profiles');
    
    return NextResponse.json({
      status: isInitialized ? 'initialized' : 'not_initialized',
      tables: tables,
      message: isInitialized ? 'Database is ready' : 'Database needs initialization'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Database connection failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}