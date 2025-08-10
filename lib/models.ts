import { query } from './database';

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  raw_text: string | null;
  summary: string | null;
  source_type: 'telegram' | 'web' | 'upload';
  file_url: string | null;
  status: 'raw' | 'processing' | 'processed' | 'error';
  language: string | null;
  metadata: any;
  created_at: Date;
  updated_at: Date;
  tags?: string[];
}

export interface Tag {
  id: string;
  name: string;
  created_at: Date;
}

export interface Chunk {
  id: string;
  note_id: string;
  chunk_text: string;
  embedding: number[] | null;
  order_index: number | null;
  metadata: any;
  created_at: Date;
}

export interface FileRecord {
  id: string;
  user_id: string;
  note_id: string | null;
  filename: string;
  mime_type: string | null;
  file_size: bigint | null;
  s3_key: string;
  s3_url: string;
  metadata: any;
  created_at: Date;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: Date | null;
  completed_at: Date | null;
  source_note_id: string | null;
  source_type: 'manual' | 'ai_generated';
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_datetime: Date;
  end_datetime: Date | null;
  all_day: boolean;
  recurrence_rule: string | null;
  status: 'tentative' | 'confirmed' | 'cancelled';
  source_note_id: string | null;
  source_type: 'manual' | 'ai_generated';
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

// Note operations
export async function createNote(data: {
  user_id: string;
  title?: string;
  raw_text?: string;
  source_type: 'telegram' | 'web' | 'upload';
  file_url?: string;
  metadata?: any;
}): Promise<Note> {
  const result = await query(
    `INSERT INTO notes (user_id, title, raw_text, source_type, file_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.user_id,
      data.title || null,
      data.raw_text || null,
      data.source_type,
      data.file_url || null,
      JSON.stringify(data.metadata || {})
    ]
  );
  return result.rows[0];
}

export async function getNoteById(id: string, userId: string): Promise<Note | null> {
  const result = await query(
    `SELECT n.*, 
     CASE 
       WHEN COUNT(t.name) = 0 THEN '{}' 
       ELSE array_agg(t.name) 
     END as tags
     FROM notes n
     LEFT JOIN note_tags nt ON n.id = nt.note_id
     LEFT JOIN tags t ON nt.tag_id = t.id
     WHERE n.id = $1 AND n.user_id = $2
     GROUP BY n.id`,
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function getNotesByUser(userId: string, limit = 50, offset = 0): Promise<Note[]> {
  const result = await query(
    `SELECT n.*, 
     CASE 
       WHEN COUNT(t.name) = 0 THEN '{}' 
       ELSE array_agg(t.name) 
     END as tags
     FROM notes n
     LEFT JOIN note_tags nt ON n.id = nt.note_id
     LEFT JOIN tags t ON nt.tag_id = t.id
     WHERE n.user_id = $1
     GROUP BY n.id
     ORDER BY n.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateNote(id: string, userId: string, data: Partial<Note>): Promise<Note | null> {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at') {
      fields.push(`${key} = $${paramCount++}`);
      values.push(key === 'metadata' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, userId);
  const result = await query(
    `UPDATE notes SET ${fields.join(', ')}, updated_at = NOW() 
     WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteNote(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM notes WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rowCount > 0;
}

// Tag operations
export async function createTag(name: string): Promise<Tag> {
  const result = await query(
    'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
    [name.toLowerCase()]
  );
  
  if (result.rows.length === 0) {
    // Tag already exists, fetch it
    const existing = await query('SELECT * FROM tags WHERE name = $1', [name.toLowerCase()]);
    return existing.rows[0];
  }
  
  return result.rows[0];
}

export async function linkNoteTag(noteId: string, tagId: string): Promise<void> {
  await query(
    'INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT (note_id, tag_id) DO NOTHING',
    [noteId, tagId]
  );
}

export async function getTagsByNote(noteId: string): Promise<Tag[]> {
  const result = await query(
    `SELECT t.* FROM tags t
     INNER JOIN note_tags nt ON t.id = nt.tag_id
     WHERE nt.note_id = $1`,
    [noteId]
  );
  return result.rows;
}

export async function getTagsByUser(userId: string): Promise<(Tag & { count: number })[]> {
  const result = await query(
    `SELECT t.*, COUNT(nt.note_id) as count
     FROM tags t
     INNER JOIN note_tags nt ON t.id = nt.tag_id
     INNER JOIN notes n ON nt.note_id = n.id
     WHERE n.user_id = $1
     GROUP BY t.id, t.name, t.created_at
     ORDER BY count DESC, t.name ASC`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    ...row,
    count: parseInt(row.count, 10)
  }));
}

// Chunk operations
export async function createChunk(data: {
  note_id: string;
  chunk_text: string;
  embedding?: number[];
  order_index?: number;
  metadata?: any;
}): Promise<Chunk> {
  const result = await query(
    `INSERT INTO chunks (note_id, chunk_text, embedding, order_index, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.note_id,
      data.chunk_text,
      data.embedding ? `[${data.embedding.join(',')}]` : null,
      data.order_index || null,
      JSON.stringify(data.metadata || {})
    ]
  );
  return result.rows[0];
}

export async function getChunksByNote(noteId: string, userId: string): Promise<Chunk[]> {
  const result = await query(
    `SELECT c.* FROM chunks c
     INNER JOIN notes n ON c.note_id = n.id
     WHERE c.note_id = $1 AND n.user_id = $2
     ORDER BY c.order_index`,
    [noteId, userId]
  );
  return result.rows;
}

// File operations
export async function createFileRecord(data: {
  user_id: string;
  note_id?: string;
  filename: string;
  mime_type?: string;
  file_size?: number;
  s3_key: string;
  s3_url: string;
  metadata?: any;
}): Promise<FileRecord> {
  const result = await query(
    `INSERT INTO files (user_id, note_id, filename, mime_type, file_size, s3_key, s3_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.user_id,
      data.note_id || null,
      data.filename,
      data.mime_type || null,
      data.file_size || null,
      data.s3_key,
      data.s3_url,
      JSON.stringify(data.metadata || {})
    ]
  );
  return result.rows[0];
}

// Search operations
export async function searchNotes(
  userId: string,
  searchQuery: string,
  embedding?: number[],
  limit = 10
): Promise<any[]> {
  if (embedding) {
    // Vector search
    const result = await query(
      `SELECT DISTINCT n.*, 
        1 - (c.embedding <=> $2) as similarity
       FROM notes n
       INNER JOIN chunks c ON n.id = c.note_id
       WHERE n.user_id = $1 
         AND 1 - (c.embedding <=> $2) > 0.7
       ORDER BY similarity DESC
       LIMIT $3`,
      [userId, `[${embedding.join(',')}]`, limit]
    );
    return result.rows;
  } else {
    // Full-text search
    const result = await query(
      `SELECT n.*,
        ts_rank(to_tsvector('english', COALESCE(raw_text, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(title, '')), 
                plainto_tsquery('english', $2)) as rank
       FROM notes n
       WHERE n.user_id = $1 
         AND to_tsvector('english', COALESCE(raw_text, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(title, ''))
         @@ plainto_tsquery('english', $2)
       ORDER BY rank DESC
       LIMIT $3`,
      [userId, searchQuery, limit]
    );
    return result.rows;
  }
}

// Task operations
export async function createTask(data: {
  user_id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: Date;
  source_note_id?: string;
  source_type?: 'manual' | 'ai_generated';
  metadata?: any;
}): Promise<Task> {
  const result = await query(
    `INSERT INTO tasks (user_id, title, description, priority, due_date, source_note_id, source_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.user_id,
      data.title,
      data.description || null,
      data.priority || 'medium',
      data.due_date || null,
      data.source_note_id || null,
      data.source_type || 'manual',
      JSON.stringify(data.metadata || {})
    ]
  );
  return result.rows[0];
}

export async function getTaskById(id: string, userId: string): Promise<Task | null> {
  const result = await query(
    'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function getTasksByUser(userId: string, status?: string, limit = 50, offset = 0): Promise<Task[]> {
  let queryText = `
    SELECT * FROM tasks 
    WHERE user_id = $1
  `;
  const params = [userId];
  
  if (status) {
    queryText += ` AND status = $2`;
    params.push(status);
    queryText += ` ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT $3 OFFSET $4`;
    params.push(limit.toString(), offset.toString());
  } else {
    queryText += ` ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT $2 OFFSET $3`;
    params.push(limit.toString(), offset.toString());
  }
  
  const result = await query(queryText, params);
  return result.rows;
}

export async function updateTask(id: string, userId: string, data: Partial<Task>): Promise<Task | null> {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at') {
      fields.push(`${key} = $${paramCount++}`);
      if (key === 'metadata') {
        values.push(JSON.stringify(value));
      } else if (key === 'completed_at' && data.status === 'completed' && !value) {
        values.push(new Date());
      } else {
        values.push(value);
      }
    }
  }

  if (fields.length === 0) return null;

  values.push(id, userId);
  const result = await query(
    `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW() 
     WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteTask(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rowCount > 0;
}

// Calendar Event operations
export async function createCalendarEvent(data: {
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_datetime: Date;
  end_datetime?: Date;
  all_day?: boolean;
  recurrence_rule?: string;
  status?: 'tentative' | 'confirmed' | 'cancelled';
  source_note_id?: string;
  source_type?: 'manual' | 'ai_generated';
  metadata?: any;
}): Promise<CalendarEvent> {
  const result = await query(
    `INSERT INTO calendar_events (user_id, title, description, location, start_datetime, end_datetime, all_day, recurrence_rule, status, source_note_id, source_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.user_id,
      data.title,
      data.description || null,
      data.location || null,
      data.start_datetime,
      data.end_datetime || null,
      data.all_day || false,
      data.recurrence_rule || null,
      data.status || 'confirmed',
      data.source_note_id || null,
      data.source_type || 'manual',
      JSON.stringify(data.metadata || {})
    ]
  );
  return result.rows[0];
}

export async function getCalendarEventById(id: string, userId: string): Promise<CalendarEvent | null> {
  const result = await query(
    'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function getCalendarEventsByUser(
  userId: string, 
  startDate?: Date, 
  endDate?: Date, 
  limit = 100, 
  offset = 0
): Promise<CalendarEvent[]> {
  let queryText = `
    SELECT * FROM calendar_events 
    WHERE user_id = $1
  `;
  const params = [userId];
  let paramCount = 2;
  
  if (startDate) {
    queryText += ` AND start_datetime >= $${paramCount}`;
    params.push(startDate.toISOString());
    paramCount++;
  }
  
  if (endDate) {
    queryText += ` AND start_datetime <= $${paramCount}`;
    params.push(endDate.toISOString());
    paramCount++;
  }
  
  queryText += ` ORDER BY start_datetime ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit.toString(), offset.toString());
  
  const result = await query(queryText, params);
  return result.rows;
}

export async function updateCalendarEvent(id: string, userId: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at') {
      fields.push(`${key} = $${paramCount++}`);
      values.push(key === 'metadata' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return null;

  values.push(id, userId);
  const result = await query(
    `UPDATE calendar_events SET ${fields.join(', ')}, updated_at = NOW() 
     WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteCalendarEvent(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rowCount > 0;
}