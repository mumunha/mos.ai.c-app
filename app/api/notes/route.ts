import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNote, getNotesByUser } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const notes = await getNotesByUser(user.id, limit, offset);
    
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, raw_text, source_type, file_url, metadata } = body;

    if (!raw_text && !file_url) {
      return NextResponse.json(
        { error: 'Either raw_text or file_url is required' },
        { status: 400 }
      );
    }

    const note = await createNote({
      user_id: user.id,
      title,
      raw_text,
      source_type: source_type || 'web',
      file_url,
      metadata
    });

    // Trigger AI processing using shared processor
    try {
      if (note.raw_text || note.file_url) {
        const { processNoteById } = await import('@/lib/note-processor');
        // Process in background without blocking the response
        processNoteById(note.id, 'web-api').catch(error => {
          console.error('❌ Background processing failed:', error);
        });
      } else {
        console.log(`⚠️ Note ${note.id} has no text or file to process, skipping AI processing`);
      }
    } catch (error) {
      console.error('❌ Error setting up background processing:', error);
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}