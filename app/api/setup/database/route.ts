import { NextResponse } from 'next/server';
import { setupDatabase } from '@/scripts/setup-database';

export async function POST() {
  try {
    // Only allow in development or with proper auth
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Database setup not available in production' },
        { status: 403 }
      );
    }

    await setupDatabase();
    
    return NextResponse.json({
      message: 'Database setup completed successfully'
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { error: 'Database setup failed' },
      { status: 500 }
    );
  }
}