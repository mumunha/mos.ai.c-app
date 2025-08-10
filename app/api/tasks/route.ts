import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createTask, getTasksByUser } from '@/lib/models';

// GET /api/tasks - Get all tasks for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const tasks = await getTasksByUser(user.id, status, limit, offset);

    return NextResponse.json({
      tasks,
      total: tasks.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
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

    // Parse due_date if provided
    let due_date = null;
    if (data.due_date) {
      due_date = new Date(data.due_date);
      if (isNaN(due_date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due_date format' },
          { status: 400 }
        );
      }
    }

    const task = await createTask({
      user_id: user.id,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      priority: data.priority || 'medium',
      due_date: due_date || undefined,
      source_note_id: data.source_note_id || undefined,
      source_type: data.source_type || 'manual',
      metadata: data.metadata || {}
    });

    return NextResponse.json(task, { status: 201 });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}