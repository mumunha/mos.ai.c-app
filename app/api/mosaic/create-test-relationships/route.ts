import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's content
    const [notes, tasks, events] = await Promise.all([
      query('SELECT id, title FROM notes WHERE user_id = $1 LIMIT 10', [user.id]),
      query('SELECT id, title FROM tasks WHERE user_id = $1 LIMIT 10', [user.id]),
      query('SELECT id, title FROM calendar_events WHERE user_id = $1 LIMIT 10', [user.id])
    ]);

    console.log('Found content:', {
      notes: notes.rows.length,
      tasks: tasks.rows.length,
      events: events.rows.length
    });

    // Create some test entities if none exist
    const entitiesResult = await query(
      'SELECT id FROM entities WHERE user_id = $1 LIMIT 1',
      [user.id]
    );

    if (entitiesResult.rows.length === 0 && notes.rows.length > 0) {
      console.log('Creating test entities...');
      
      // Create a few test entities
      const testEntities = [
        { name: 'Project Alpha', type: 'concept', description: 'Main project' },
        { name: 'John Doe', type: 'person', description: 'Team lead' },
        { name: 'Meeting Room A', type: 'location', description: 'Conference room' },
        { name: 'Q4 2024', type: 'date', description: 'Fourth quarter' }
      ];

      for (const entity of testEntities) {
        const result = await query(
          `INSERT INTO entities (user_id, name, type, description)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [user.id, entity.name, entity.type, entity.description]
        );

        const entityId = result.rows[0].id;

        // Link to first note
        if (notes.rows.length > 0) {
          await query(
            `INSERT INTO entity_sources (entity_id, source_type, source_id)
             VALUES ($1, 'note', $2)
             ON CONFLICT DO NOTHING`,
            [entityId, notes.rows[0].id]
          );
        }

        // Link to first task
        if (tasks.rows.length > 0) {
          await query(
            `INSERT INTO entity_sources (entity_id, source_type, source_id)
             VALUES ($1, 'task', $2)
             ON CONFLICT DO NOTHING`,
            [entityId, tasks.rows[0].id]
          );
        }
      }
    }

    // Create relationships between entities
    const entities = await query(
      'SELECT id, name, type FROM entities WHERE user_id = $1',
      [user.id]
    );

    let relationshipsCreated = 0;
    
    if (entities.rows.length >= 2) {
      // Create some relationships between entities
      for (let i = 0; i < Math.min(entities.rows.length - 1, 5); i++) {
        await query(
          `INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [entities.rows[i].id, entities.rows[i + 1].id, 'related_to']
        );
        relationshipsCreated++;
      }
    }

    return NextResponse.json({
      message: 'Test relationships created',
      stats: {
        notes: notes.rows.length,
        tasks: tasks.rows.length,
        events: events.rows.length,
        entities: entities.rows.length,
        relationshipsCreated
      }
    });

  } catch (error) {
    console.error('Error creating test relationships:', error);
    return NextResponse.json(
      { error: 'Failed to create test relationships' },
      { status: 500 }
    );
  }
}