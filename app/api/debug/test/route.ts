import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test database connection
    const { query } = await import('@/lib/database');
    const result = await query('SELECT COUNT(*) as count FROM processing_logs');
    
    return NextResponse.json({
      message: 'Debug API working!',
      user: user.email,
      processing_logs_count: result.rows[0].count,
      env_check: {
        database_url: !!process.env.DATABASE_URL,
        openai_key: !!process.env.OPENAI_API_KEY,
        jwt_secret: !!process.env.JWT_SECRET
      }
    });
  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json(
      { 
        error: 'Debug test failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}