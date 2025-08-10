import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { splitIntoChunks } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('Testing chunking for text of length:', text.length);
    
    try {
      const chunks = splitIntoChunks(text);
      
      return NextResponse.json({
        success: true,
        original_length: text.length,
        chunks_count: chunks.length,
        chunks: chunks.map((chunk, index) => ({
          index,
          length: chunk.length,
          preview: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : '')
        }))
      });
    } catch (error) {
      console.error('Chunking test failed:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Chunking test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}