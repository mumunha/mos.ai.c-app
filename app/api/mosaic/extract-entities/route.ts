import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { extractEntitiesFromNote, extractEntitiesFromTask, extractEntitiesFromEvent } from '@/lib/entity-extraction';

export async function POST(request: NextRequest) {
  // Handle missing OpenAI API key gracefully during build time
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    switch (type) {
      case 'note':
        await extractEntitiesFromNote(id);
        break;
      case 'task':
        await extractEntitiesFromTask(id);
        break;
      case 'event':
        await extractEntitiesFromEvent(id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error extracting entities:', error);
    return NextResponse.json(
      { error: 'Failed to extract entities' },
      { status: 500 }
    );
  }
}