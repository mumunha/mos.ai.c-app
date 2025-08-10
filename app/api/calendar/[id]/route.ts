import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCalendarEventById, updateCalendarEvent, deleteCalendarEvent } from '@/lib/models';

// GET /api/calendar/[id] - Get a specific calendar event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const event = await getCalendarEventById(id, user.id);
    
    if (!event) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    return NextResponse.json(event);

  } catch (error) {
    console.error('Error fetching calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar event' },
      { status: 500 }
    );
  }
}

// PUT /api/calendar/[id] - Update a specific calendar event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    
    // Parse dates if provided
    if (data.start_datetime) {
      const start_datetime = new Date(data.start_datetime);
      if (isNaN(start_datetime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start_datetime format' },
          { status: 400 }
        );
      }
      data.start_datetime = start_datetime;
    }

    if (data.end_datetime) {
      const end_datetime = new Date(data.end_datetime);
      if (isNaN(end_datetime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end_datetime format' },
          { status: 400 }
        );
      }
      data.end_datetime = end_datetime;
    }

    const event = await updateCalendarEvent(id, user.id, data);
    
    if (!event) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    return NextResponse.json(event);

  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/[id] - Delete a specific calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const success = await deleteCalendarEvent(id, user.id);
    
    if (!success) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Calendar event deleted successfully' });

  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}