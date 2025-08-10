import { processNote, transcribeAudio, generateNoteTitle } from './ai';
import { updateNote, createTag, linkNoteTag, createChunk, createTask, createCalendarEvent } from './models';
import { logProcessingStart, logProcessingComplete, logProcessingFailed } from './processing-logs';
import { extractEntitiesFromNote } from './entity-extraction';
import { query } from './database';

export async function processNoteById(noteId: string, source: string = 'unknown'): Promise<{
  success: boolean;
  message: string;
  processingTime?: number;
}> {
  const startTime = Date.now();
  let logId: string | null = null;
  
  try {
    console.log(`🚀 [${source}] Starting AI processing for note ${noteId}`);
    
    // Get the note
    const result = await query('SELECT * FROM notes WHERE id = $1', [noteId]);
    if (result.rows.length === 0) {
      return { success: false, message: `Note ${noteId} not found` };
    }
    
    const note = result.rows[0];
    logId = await logProcessingStart(noteId, 'ai_processing', `Processing note from ${source}: ${note.title || 'Untitled'}`);
    
    let textToProcess = note.raw_text;
    
    // Handle voice messages and files that need transcription
    if (!textToProcess && note.file_url) {
      const metadata = typeof note.metadata === 'string' ? JSON.parse(note.metadata) : note.metadata;
      
      if (metadata?.voice_duration) {
        console.log(`🎤 [${source}] Processing voice transcription for note ${noteId}`);
        
        const audioResponse = await fetch(note.file_url);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
        }
        
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        const transcription = await transcribeAudio(audioBuffer, 'voice.ogg');
        
        await updateNote(note.id, note.user_id, { 
          raw_text: transcription,
          metadata: { ...metadata, transcription_completed: true }
        });
        
        textToProcess = transcription;
      }
    }
    
    if (!textToProcess) {
      await logProcessingFailed(logId, 'Note has no text to process');
      return { success: false, message: 'Note has no text to process' };
    }
    
    // Mark as processing
    await updateNote(note.id, note.user_id, { status: 'processing' });
    
    // Process with AI
    const processed = await processNote(textToProcess);
    
    // Generate title if note doesn't have one or has a generic title
    let generatedTitle = note.title;
    const isGenericTitle = !note.title || 
      note.title.trim() === '' || 
      /^(Voice Message|Telegram Message|Document|Image)\s*-\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(note.title);
    
    if (isGenericTitle) {
      console.log(`📝 [${source}] Generating AI title for note ${noteId} (current: "${note.title || 'empty'}")`);
      generatedTitle = await generateNoteTitle(textToProcess);
      console.log(`📝 [${source}] Generated title: "${generatedTitle}"`);
    }
    
    // Update note with results
    await updateNote(note.id, note.user_id, {
      title: generatedTitle,
      summary: processed.summary,
      language: processed.language,
      status: 'processed'
    });
    
    // Create tags
    let tagsCreated = 0;
    for (const tagName of processed.tags) {
      try {
        const tag = await createTag(tagName.toLowerCase().trim());
        await linkNoteTag(note.id, tag.id);
        tagsCreated++;
      } catch (error) {
        console.error('Error creating tag:', error);
      }
    }
    
    // Create chunks
    let chunksCreated = 0;
    for (let i = 0; i < processed.chunks.length; i++) {
      const chunk = processed.chunks[i];
      try {
        await createChunk({
          note_id: note.id,
          chunk_text: chunk.text,
          embedding: chunk.embedding,
          order_index: i,
          metadata: { tokens: chunk.tokens }
        });
        chunksCreated++;
      } catch (error) {
        console.error('Error creating chunk:', error);
      }
    }
    
    // Create tasks and events
    let tasksCreated = 0;
    for (const taskData of processed.tasks) {
      try {
        await createTask({
          user_id: note.user_id,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          due_date: taskData.due_date ? new Date(taskData.due_date) : undefined,
          source_note_id: note.id,
          source_type: 'ai_generated',
          metadata: { extracted_from_note: true }
        });
        tasksCreated++;
      } catch (error) {
        console.error('Error creating task:', error);
      }
    }
    
    let eventsCreated = 0;
    for (const eventData of processed.calendar_events) {
      try {
        await createCalendarEvent({
          user_id: note.user_id,
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start_datetime: new Date(eventData.start_datetime),
          end_datetime: eventData.end_datetime ? new Date(eventData.end_datetime) : undefined,
          all_day: eventData.all_day,
          source_note_id: note.id,
          source_type: 'ai_generated',
          metadata: { extracted_from_note: true }
        });
        eventsCreated++;
      } catch (error) {
        console.error('Error creating calendar event:', error);
      }
    }
    
    // Extract entities
    let entitiesExtracted = 0;
    try {
      await extractEntitiesFromNote(note.id);
      entitiesExtracted = 1;
    } catch (error) {
      console.error('Error extracting entities:', error);
    }
    
    const processingTime = Date.now() - startTime;
    const message = `Successfully processed: ${chunksCreated} chunks, ${tagsCreated} tags, ${tasksCreated} tasks, ${eventsCreated} events`;
    
    await logProcessingComplete(logId, message, processingTime);
    console.log(`✅ [${source}] Processing completed for note ${noteId}: ${message}`);
    
    return { 
      success: true, 
      message,
      processingTime 
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (logId) {
      await logProcessingFailed(logId, `Processing failed: ${errorMessage}`, { source }, processingTime);
    }
    
    try {
      const result = await query('SELECT user_id FROM notes WHERE id = $1', [noteId]);
      if (result.rows.length > 0) {
        await updateNote(noteId, result.rows[0].user_id, { status: 'error' });
      }
    } catch (updateError) {
      console.error('Error updating note status to error:', updateError);
    }
    
    console.error(`❌ [${source}] Processing failed for note ${noteId}:`, error);
    return { success: false, message: `Processing failed: ${errorMessage}` };
  }
}