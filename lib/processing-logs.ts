import { query } from './database';

export interface ProcessingLog {
  id: string;
  note_id: string;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  message: string | null;
  error_details: any;
  processing_time_ms: number | null;
  created_at: Date;
}

export async function logProcessingStart(
  noteId: string, 
  operation: string, 
  message?: string
): Promise<string> {
  const result = await query(
    `INSERT INTO processing_logs (note_id, operation, status, message)
     VALUES ($1, $2, 'started', $3)
     RETURNING id`,
    [noteId, operation, message || null]
  );
  return result.rows[0].id;
}

export async function logProcessingComplete(
  logId: string,
  message?: string,
  processingTimeMs?: number
): Promise<void> {
  await query(
    `UPDATE processing_logs 
     SET status = 'completed', message = $2, processing_time_ms = $3
     WHERE id = $1`,
    [logId, message || null, processingTimeMs || null]
  );
}

export async function logProcessingFailed(
  logId: string,
  message: string,
  errorDetails?: any,
  processingTimeMs?: number
): Promise<void> {
  await query(
    `UPDATE processing_logs 
     SET status = 'failed', message = $2, error_details = $3, processing_time_ms = $4
     WHERE id = $1`,
    [logId, message, JSON.stringify(errorDetails || {}), processingTimeMs || null]
  );
}

export async function getProcessingLogs(
  userId: string,
  noteId?: string,
  limit: number = 100,
  offset: number = 0
): Promise<ProcessingLog[]> {
  let queryText = `
    SELECT pl.*, n.title as note_title
    FROM processing_logs pl
    LEFT JOIN notes n ON pl.note_id = n.id
    WHERE n.user_id = $1
  `;
  let params: any[] = [userId];
  
  if (noteId) {
    queryText += ` AND pl.note_id = $2`;
    params.push(noteId);
  }
  
  queryText += ` ORDER BY pl.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const result = await query(queryText, params);
  return result.rows;
}

export async function getRecentFailures(userId: string, limit: number = 50): Promise<ProcessingLog[]> {
  const result = await query(
    `SELECT pl.*, n.title as note_title
     FROM processing_logs pl
     LEFT JOIN notes n ON pl.note_id = n.id
     WHERE pl.status = 'failed' AND n.user_id = $1
     ORDER BY pl.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function getProcessingStats(userId: string): Promise<{
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
  avg_processing_time: number;
}> {
  const result = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COUNT(CASE WHEN status = 'started' THEN 1 END) as in_progress,
      AVG(processing_time_ms) as avg_processing_time
    FROM processing_logs pl
    LEFT JOIN notes n ON pl.note_id = n.id
    WHERE n.user_id = $1
  `, [userId]);
  
  return result.rows[0];
}