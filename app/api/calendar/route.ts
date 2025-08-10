import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCalendarEvent, getCalendarEventsByUser } from '@/lib/models';

// GET /api/calendar - Get calendar events for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined;
    const endDate = searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate dates if provided
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start_date format' },
        { status: 400 }
      );
    }
    
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid end_date format' },
        { status: 400 }
      );
    }

    const events = await getCalendarEventsByUser(user.id, startDate, endDate, limit, offset);

    return NextResponse.json({
      events,
      total: events.length,
      limit,
      offset,
      start_date: startDate?.toISOString(),
      end_date: endDate?.toISOString()
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

// POST /api/calendar - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.title || typeof data.title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!data.start_datetime) {
      return NextResponse.json(
        { error: 'start_datetime is required' },
        { status: 400 }
      );
    }

    // Parse dates
    const start_datetime = new Date(data.start_datetime);
    if (isNaN(start_datetime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start_datetime format' },
        { status: 400 }
      );
    }

    let end_datetime = null;
    if (data.end_datetime) {
      end_datetime = new Date(data.end_datetime);
      if (isNaN(end_datetime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end_datetime format' },
          { status: 400 }
        );
      }
    }

    const event = await createCalendarEvent({
      user_id: user.id,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      location: data.location?.trim() || undefined,
      start_datetime,
      end_datetime: end_datetime || undefined,
      all_day: data.all_day || false,
      recurrence_rule: data.recurrence_rule || undefined,
      status: data.status || 'confirmed',
      source_note_id: data.source_note_id || undefined,
      source_type: data.source_type || 'manual',
      metadata: data.metadata || {}
    });

    return NextResponse.json(event, { status: 201 });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}