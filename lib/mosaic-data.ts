import { query } from './database';
import { createEmbedding } from './ai';

export interface MosaicItem {
  id: string;
  type: 'note' | 'task' | 'event' | 'entity';
  title: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  relationships: Array<{
    targetId: string;
    type: string;
  }>;
  created_at: Date;
}

export interface Projection {
  id: string;
  type: string;
  x: number;
  y: number;
}

export interface AtlasData {
  items: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    vector?: number[];
    x?: number;
    y?: number;
    metadata: Record<string, any>;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

// Collect all notes for mosaic visualization
async function getNotesForMosaic(userId: string): Promise<MosaicItem[]> {
  const notesResult = await query(
    `SELECT 
      n.id, 
      n.title, 
      n.raw_text, 
      n.summary,
      n.created_at,
      n.metadata,
      array_agg(DISTINCT t.name) as tags
     FROM notes n
     LEFT JOIN note_tags nt ON n.id = nt.note_id
     LEFT JOIN tags t ON nt.tag_id = t.id
     WHERE n.user_id = $1 AND n.status = 'processed'
     GROUP BY n.id`,
    [userId]
  );

  const notes: MosaicItem[] = [];

  for (const note of notesResult.rows) {
    // Get the first chunk's embedding or create one
    const chunkResult = await query(
      `SELECT embedding FROM chunks WHERE note_id = $1 ORDER BY order_index LIMIT 1`,
      [note.id]
    );

    let embedding = chunkResult.rows[0]?.embedding;
    
    if (!embedding) {
      // Generate embedding if not available
      const content = note.summary || note.raw_text || note.title || '';
      if (content) {
        embedding = await createEmbedding(content.slice(0, 8000));
      } else {
        continue; // Skip notes without content
      }
    }

    // Get entity relationships for this note
    const relationshipsResult = await query(
      `SELECT DISTINCT e.id as entity_id, er.relationship_type
       FROM entity_sources es
       JOIN entities e ON es.entity_id = e.id
       LEFT JOIN entity_relationships er ON (er.source_entity_id = e.id OR er.target_entity_id = e.id)
       WHERE es.source_type = 'note' AND es.source_id = $1`,
      [note.id]
    );

    const relationships = relationshipsResult.rows.map((r: any) => ({
      targetId: r.entity_id,
      type: r.relationship_type || 'mentions'
    }));

    notes.push({
      id: note.id,
      type: 'note',
      title: note.title || 'Untitled Note',
      content: note.summary || note.raw_text || '',
      embedding,
      metadata: {
        ...note.metadata,
        tags: note.tags || [],
        created_at: note.created_at
      },
      relationships,
      created_at: note.created_at
    });
  }

  return notes;
}

// Collect all tasks for mosaic visualization
async function getTasksForMosaic(userId: string): Promise<MosaicItem[]> {
  const tasksResult = await query(
    `SELECT id, title, description, status, priority, due_date, created_at, metadata
     FROM tasks
     WHERE user_id = $1`,
    [userId]
  );

  const tasks: MosaicItem[] = [];

  for (const task of tasksResult.rows) {
    const content = `${task.title} ${task.description || ''}`.trim();
    const embedding = await createEmbedding(content);

    // Get entity relationships
    const relationshipsResult = await query(
      `SELECT DISTINCT e.id as entity_id, er.relationship_type
       FROM entity_sources es
       JOIN entities e ON es.entity_id = e.id
       LEFT JOIN entity_relationships er ON (er.source_entity_id = e.id OR er.target_entity_id = e.id)
       WHERE es.source_type = 'task' AND es.source_id = $1`,
      [task.id]
    );

    const relationships = relationshipsResult.rows.map((r: any) => ({
      targetId: r.entity_id,
      type: r.relationship_type || 'mentions'
    }));

    tasks.push({
      id: task.id,
      type: 'task',
      title: task.title,
      content,
      embedding,
      metadata: {
        ...task.metadata,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date
      },
      relationships,
      created_at: task.created_at
    });
  }

  return tasks;
}

// Collect all calendar events for mosaic visualization
async function getEventsForMosaic(userId: string): Promise<MosaicItem[]> {
  const eventsResult = await query(
    `SELECT id, title, description, location, start_datetime, end_datetime, status, created_at, metadata
     FROM calendar_events
     WHERE user_id = $1`,
    [userId]
  );

  const events: MosaicItem[] = [];

  for (const event of eventsResult.rows) {
    const content = `${event.title} ${event.description || ''} ${event.location || ''}`.trim();
    const embedding = await createEmbedding(content);

    // Get entity relationships
    const relationshipsResult = await query(
      `SELECT DISTINCT e.id as entity_id, er.relationship_type
       FROM entity_sources es
       JOIN entities e ON es.entity_id = e.id
       LEFT JOIN entity_relationships er ON (er.source_entity_id = e.id OR er.target_entity_id = e.id)
       WHERE es.source_type = 'event' AND es.source_id = $1`,
      [event.id]
    );

    const relationships = relationshipsResult.rows.map((r: any) => ({
      targetId: r.entity_id,
      type: r.relationship_type || 'mentions'
    }));

    events.push({
      id: event.id,
      type: 'event',
      title: event.title,
      content,
      embedding,
      metadata: {
        ...event.metadata,
        location: event.location,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        status: event.status
      },
      relationships,
      created_at: event.created_at
    });
  }

  return events;
}

// Collect all entities for mosaic visualization
async function getEntitiesForMosaic(userId: string): Promise<MosaicItem[]> {
  const entitiesResult = await query(
    `SELECT id, name, type, description, properties, embedding, created_at
     FROM entities
     WHERE user_id = $1`,
    [userId]
  );

  const entities: MosaicItem[] = [];

  for (const entity of entitiesResult.rows) {
    // Get entity relationships
    const relationshipsResult = await query(
      `SELECT target_entity_id as target_id, relationship_type
       FROM entity_relationships
       WHERE source_entity_id = $1
       UNION
       SELECT source_entity_id as target_id, relationship_type
       FROM entity_relationships
       WHERE target_entity_id = $1`,
      [entity.id]
    );

    const relationships = relationshipsResult.rows.map((r: any) => ({
      targetId: r.target_id,
      type: r.relationship_type
    }));

    entities.push({
      id: entity.id,
      type: 'entity',
      title: entity.name,
      content: entity.description || `${entity.type}: ${entity.name}`,
      embedding: entity.embedding,
      metadata: {
        entity_type: entity.type,
        properties: entity.properties
      },
      relationships,
      created_at: entity.created_at
    });
  }

  return entities;
}

// Collect all data for mosaic visualization
export async function getMosaicData(userId: string): Promise<MosaicItem[]> {
  const [notes, tasks, events, entities] = await Promise.all([
    getNotesForMosaic(userId),
    getTasksForMosaic(userId),
    getEventsForMosaic(userId),
    getEntitiesForMosaic(userId)
  ]);

  return [...notes, ...tasks, ...events, ...entities];
}

// Get pre-computed projections from database
export async function getProjections(userId: string): Promise<Projection[]> {
  const result = await query(
    `SELECT item_id as id, item_type as type, x, y
     FROM mosaic_projections
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

// Save computed projections to database
export async function saveProjections(userId: string, projections: Projection[]): Promise<void> {
  const client = await query('BEGIN');

  try {
    for (const proj of projections) {
      await query(
        `INSERT INTO mosaic_projections (user_id, item_type, item_id, x, y)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, item_type, item_id)
         DO UPDATE SET x = $4, y = $5, updated_at = NOW()`,
        [userId, proj.type, proj.id, proj.x, proj.y]
      );
    }

    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

// Export data in format suitable for Embedding Atlas
export async function exportForEmbeddingAtlas(userId: string): Promise<AtlasData> {
  const items = await getMosaicData(userId);
  const projections = await getProjections(userId);

  // Create a map of projections by id
  const projectionMap = new Map(projections.map(p => [p.id, p]));

  // Format items for Atlas
  const atlasItems = items.map(item => {
    const projection = projectionMap.get(item.id);
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.content,
      vector: item.embedding,
      x: projection?.x,
      y: projection?.y,
      metadata: {
        ...item.metadata,
        created_at: item.created_at
      }
    };
  });

  // Collect all relationships
  const relationships: Array<{ source: string; target: string; type: string }> = [];
  
  // Add existing entity relationships
  for (const item of items) {
    for (const rel of item.relationships) {
      relationships.push({
        source: item.id,
        target: rel.targetId,
        type: rel.type
      });
    }
  }

  // Create similarity-based relationships between all items
  // Connect items that are semantically similar (based on embeddings)
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i];
      const item2 = items[j];
      
      // Skip if both are entities (we already have those relationships)
      if (item1.type === 'entity' && item2.type === 'entity') continue;
      
      // Calculate cosine similarity between embeddings
      if (item1.embedding && item2.embedding) {
        const similarity = cosineSimilarity(item1.embedding, item2.embedding);
        
        // Create relationship if similarity is above threshold
        if (similarity > 0.7) { // Adjust threshold as needed
          relationships.push({
            source: item1.id,
            target: item2.id,
            type: 'similar'
          });
        }
      }
      
      // Create relationships based on shared tags (for notes)
      if (item1.type === 'note' && item2.type === 'note') {
        const tags1 = item1.metadata.tags || [];
        const tags2 = item2.metadata.tags || [];
        const sharedTags = tags1.filter((tag: string) => tags2.includes(tag));
        
        if (sharedTags.length > 0) {
          relationships.push({
            source: item1.id,
            target: item2.id,
            type: 'shared_tags'
          });
        }
      }
      
      // Create temporal relationships (items created close in time)
      const timeDiff = Math.abs(item1.created_at.getTime() - item2.created_at.getTime());
      const dayInMs = 24 * 60 * 60 * 1000;
      
      if (timeDiff < dayInMs) { // Within 24 hours
        relationships.push({
          source: item1.id,
          target: item2.id,
          type: 'temporal'
        });
      }
    }
  }

  return {
    items: atlasItems,
    relationships
  };
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (norm1 * norm2);
}

// Compute UMAP projections (this will be done client-side in the browser)
// The actual UMAP computation is handled by Embedding Atlas library
export async function computeProjections(items: MosaicItem[]): Promise<Projection[]> {
  // This is a placeholder - actual UMAP computation happens in the browser
  // using the embedding-atlas library
  return items.map(item => ({
    id: item.id,
    type: item.type,
    x: 0,
    y: 0
  }));
}