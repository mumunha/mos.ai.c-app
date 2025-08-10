import OpenAI from 'openai';
import { query } from './database';
import { createEmbedding, getOpenAIClient } from './ai';

export interface ExtractedEntity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'date' | 'event';
  description?: string;
  properties?: Record<string, any>;
  confidence: number;
}

export interface EntityRelationship {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: EntityRelationship[];
}

// Lazily access the OpenAI client to avoid build-time env checks
function openaiClient(): OpenAI {
  return getOpenAIClient();
}

const ENTITY_EXTRACTION_PROMPT = `
Extract entities and relationships from the following text.

Entity Types:
- person: People mentioned (names, roles)
- organization: Companies, institutions, groups
- location: Places, addresses, regions
- concept: Abstract ideas, topics, technologies
- date: Specific dates or time periods
- event: Meetings, conferences, occurrences

Relationship Types:
- works_at: Person works at Organization
- located_in: Entity is in Location
- related_to: General relationship
- participates_in: Person/Org participates in Event
- mentions: Document mentions Entity

Return in this JSON format:
{
  "entities": [
    {
      "name": "string",
      "type": "person|organization|location|concept|date|event",
      "description": "brief description",
      "properties": {},
      "confidence": 0.0-1.0
    }
  ],
  "relationships": [
    {
      "source": "entity name",
      "target": "entity name",
      "type": "relationship type",
      "properties": {}
    }
  ]
}
`;

// Main extraction function using OpenAI with structured output
export async function extractEntitiesFromText(text: string): Promise<ExtractionResult> {
  try {
    const response = await openaiClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: ENTITY_EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: text.slice(0, 8000) // Limit input size
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      entities: result.entities || [],
      relationships: result.relationships || []
    };
  } catch (error) {
    console.error('Error extracting entities:', error);
    return { entities: [], relationships: [] };
  }
}

// Generate embeddings for entities using existing OpenAI setup
export async function embedEntity(entity: ExtractedEntity): Promise<number[]> {
  const entityText = `${entity.type}: ${entity.name}. ${entity.description || ''}`;
  return await createEmbedding(entityText);
}

// Store extracted entities in database
async function storeEntity(userId: string, entity: ExtractedEntity, embedding: number[]): Promise<string> {
  // Check if entity already exists
  const existing = await query(
    `SELECT id FROM entities 
     WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND type = $3`,
    [userId, entity.name, entity.type]
  );

  if (existing.rows.length > 0) {
    // Update existing entity
    await query(
      `UPDATE entities 
       SET description = COALESCE($1, description),
           properties = properties || $2,
           embedding = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [entity.description, entity.properties || {}, `[${embedding.join(',')}]`, existing.rows[0].id]
    );
    return existing.rows[0].id;
  } else {
    // Insert new entity
    const result = await query(
      `INSERT INTO entities (user_id, name, type, description, properties, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, entity.name, entity.type, entity.description, entity.properties || {}, `[${embedding.join(',')}]`]
    );
    return result.rows[0].id;
  }
}

// Store entity relationships
async function storeRelationship(
  sourceEntityId: string,
  targetEntityId: string,
  relationship: Omit<EntityRelationship, 'source' | 'target'>
): Promise<void> {
  await query(
    `INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, properties)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO UPDATE
     SET properties = entity_relationships.properties || $4`,
    [sourceEntityId, targetEntityId, relationship.type, relationship.properties || {}]
  );
}

// Link entity to its source
async function linkEntityToSource(
  entityId: string,
  sourceType: 'note' | 'task' | 'event',
  sourceId: string,
  extractedFrom?: string
): Promise<void> {
  await query(
    `INSERT INTO entity_sources (entity_id, source_type, source_id, extracted_from)
     VALUES ($1, $2, $3, $4)`,
    [entityId, sourceType, sourceId, extractedFrom]
  );
}

// Extract entities from a note
export async function extractEntitiesFromNote(noteId: string): Promise<void> {
  try {
    // Get note content
    const noteResult = await query(
      `SELECT user_id, title, raw_text, summary FROM notes WHERE id = $1`,
      [noteId]
    );

    if (noteResult.rows.length === 0) return;

    const note = noteResult.rows[0];
    const textToAnalyze = `${note.title || ''} ${note.raw_text || ''} ${note.summary || ''}`.trim();

    if (!textToAnalyze) return;

    // Extract entities and relationships
    const { entities, relationships } = await extractEntitiesFromText(textToAnalyze);

    // Store entities and create embedding for each
    const entityIdMap = new Map<string, string>();

    for (const entity of entities) {
      const embedding = await embedEntity(entity);
      const entityId = await storeEntity(note.user_id, entity, embedding);
      entityIdMap.set(entity.name.toLowerCase(), entityId);
      
      // Link entity to note
      await linkEntityToSource(entityId, 'note', noteId, textToAnalyze.slice(0, 500));
    }

    // Store relationships
    for (const rel of relationships) {
      const sourceId = entityIdMap.get(rel.source.toLowerCase());
      const targetId = entityIdMap.get(rel.target.toLowerCase());
      
      if (sourceId && targetId) {
        await storeRelationship(sourceId, targetId, { type: rel.type, properties: rel.properties });
      }
    }
  } catch (error) {
    console.error('Error extracting entities from note:', error);
    throw error;
  }
}

// Extract entities from a task
export async function extractEntitiesFromTask(taskId: string): Promise<void> {
  try {
    const taskResult = await query(
      `SELECT user_id, title, description FROM tasks WHERE id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) return;

    const task = taskResult.rows[0];
    const textToAnalyze = `${task.title} ${task.description || ''}`.trim();

    if (!textToAnalyze) return;

    const { entities, relationships } = await extractEntitiesFromText(textToAnalyze);

    const entityIdMap = new Map<string, string>();

    for (const entity of entities) {
      const embedding = await embedEntity(entity);
      const entityId = await storeEntity(task.user_id, entity, embedding);
      entityIdMap.set(entity.name.toLowerCase(), entityId);
      
      await linkEntityToSource(entityId, 'task', taskId, textToAnalyze);
    }

    for (const rel of relationships) {
      const sourceId = entityIdMap.get(rel.source.toLowerCase());
      const targetId = entityIdMap.get(rel.target.toLowerCase());
      
      if (sourceId && targetId) {
        await storeRelationship(sourceId, targetId, { type: rel.type, properties: rel.properties });
      }
    }
  } catch (error) {
    console.error('Error extracting entities from task:', error);
    throw error;
  }
}

// Extract entities from a calendar event
export async function extractEntitiesFromEvent(eventId: string): Promise<void> {
  try {
    const eventResult = await query(
      `SELECT user_id, title, description, location FROM calendar_events WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) return;

    const event = eventResult.rows[0];
    const textToAnalyze = `${event.title} ${event.description || ''} ${event.location || ''}`.trim();

    if (!textToAnalyze) return;

    const { entities, relationships } = await extractEntitiesFromText(textToAnalyze);

    const entityIdMap = new Map<string, string>();

    for (const entity of entities) {
      const embedding = await embedEntity(entity);
      const entityId = await storeEntity(event.user_id, entity, embedding);
      entityIdMap.set(entity.name.toLowerCase(), entityId);
      
      await linkEntityToSource(entityId, 'event', eventId, textToAnalyze);
    }

    for (const rel of relationships) {
      const sourceId = entityIdMap.get(rel.source.toLowerCase());
      const targetId = entityIdMap.get(rel.target.toLowerCase());
      
      if (sourceId && targetId) {
        await storeRelationship(sourceId, targetId, { type: rel.type, properties: rel.properties });
      }
    }
  } catch (error) {
    console.error('Error extracting entities from event:', error);
    throw error;
  }
}

// Entity resolution using embedding similarity
export async function resolveAndMergeEntities(userId: string): Promise<void> {
  try {
    // Get all entities for the user
    const entitiesResult = await query(
      `SELECT id, name, type, embedding FROM entities WHERE user_id = $1`,
      [userId]
    );

    const entities = entitiesResult.rows;
    const mergedEntities = new Set<string>();

    // Compare each entity with others of the same type
    for (let i = 0; i < entities.length; i++) {
      if (mergedEntities.has(entities[i].id)) continue;

      for (let j = i + 1; j < entities.length; j++) {
        if (mergedEntities.has(entities[j].id)) continue;
        
        // Only compare entities of the same type
        if (entities[i].type !== entities[j].type) continue;

        // Calculate cosine similarity
        const similarity = cosineSimilarity(entities[i].embedding, entities[j].embedding);

        // If similarity is high enough, merge entities
        if (similarity > 0.85) {
          await mergeEntities(entities[i].id, entities[j].id);
          mergedEntities.add(entities[j].id);
        }
      }
    }
  } catch (error) {
    console.error('Error resolving entities:', error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Merge two entities
async function mergeEntities(primaryId: string, duplicateId: string): Promise<void> {
  const client = await query('BEGIN');

  try {
    // Update relationships to point to primary entity
    await query(
      `UPDATE entity_relationships SET source_entity_id = $1 WHERE source_entity_id = $2`,
      [primaryId, duplicateId]
    );
    
    await query(
      `UPDATE entity_relationships SET target_entity_id = $1 WHERE target_entity_id = $2`,
      [primaryId, duplicateId]
    );

    // Move entity sources to primary entity
    await query(
      `UPDATE entity_sources SET entity_id = $1 WHERE entity_id = $2`,
      [primaryId, duplicateId]
    );

    // Delete duplicate entity
    await query(`DELETE FROM entities WHERE id = $1`, [duplicateId]);

    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}