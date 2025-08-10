import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/database';
import { extractEntitiesFromNote, extractEntitiesFromTask, extractEntitiesFromEvent } from '@/lib/entity-extraction';

export const runtime = 'nodejs';

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

    // Get all notes that haven't been processed for entities
    const notesResult = await query(
      `SELECT n.id FROM notes n 
       WHERE n.user_id = $1 AND n.status = 'processed'
       AND NOT EXISTS (
         SELECT 1 FROM entity_sources es 
         WHERE es.source_type = 'note' AND es.source_id = n.id
       )`,
      [user.id]
    );

    // Get all tasks that haven't been processed
    const tasksResult = await query(
      `SELECT t.id FROM tasks t 
       WHERE t.user_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM entity_sources es 
         WHERE es.source_type = 'task' AND es.source_id = t.id
       )`,
      [user.id]
    );

    // Get all events that haven't been processed
    const eventsResult = await query(
      `SELECT e.id FROM calendar_events e 
       WHERE e.user_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM entity_sources es 
         WHERE es.source_type = 'event' AND es.source_id = e.id
       )`,
      [user.id]
    );

    const totalItems = notesResult.rows.length + tasksResult.rows.length + eventsResult.rows.length;
    
    let processed = 0;
    const errors: string[] = [];

    // Process notes
    for (const note of notesResult.rows) {
      try {
        await extractEntitiesFromNote(note.id);
        processed++;
      } catch (error) {
        console.error(`Error processing note ${note.id}:`, error);
        errors.push(`Note ${note.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process tasks
    for (const task of tasksResult.rows) {
      try {
        await extractEntitiesFromTask(task.id);
        processed++;
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        errors.push(`Task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process events
    for (const event of eventsResult.rows) {
      try {
        await extractEntitiesFromEvent(event.id);
        processed++;
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errors.push(`Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      total: totalItems,
      processed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully extracted entities from ${processed} out of ${totalItems} items`
    });
  } catch (error) {
    console.error('Error extracting entities:', error);
    return NextResponse.json(
      { error: 'Failed to extract entities' },
      { status: 500 }
    );
  }
}