import { NextRequest, NextResponse } from 'next/server';
import { getNoteById, updateNote, createTag, linkNoteTag, createChunk, createTask, createCalendarEvent } from '@/lib/models';
import { processNote, transcribeAudio } from '@/lib/ai';
import { logProcessingStart, logProcessingComplete, logProcessingFailed } from '@/lib/processing-logs';
import { extractEntitiesFromNote } from '@/lib/entity-extraction';

export async function POST(request: NextRequest) {
  // Handle missing OpenAI API key gracefully during build time
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    );
  }

  let logId: string | null = null;
  const startTime = Date.now();
  
  try {
    const { noteId } = await request.json();
    
    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Get the note with user authentication check
    const { query } = await import('@/lib/database');
    const { getCurrentUser } = await import('@/lib/auth');
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [noteId, user.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const note = result.rows[0];
    
    // Start logging
    logId = await logProcessingStart(noteId, 'ai_processing', `Processing note: ${note.title || 'Untitled'}`);
    
    let textToProcess = note.raw_text;
    
    // Handle voice messages and files that need transcription/extraction
    if (!textToProcess && note.file_url) {
      console.log('📁 Note has file URL but no text, attempting transcription/extraction...');
      
      try {
        // Check if it's a voice message from metadata
        const metadata = typeof note.metadata === 'string' ? JSON.parse(note.metadata) : note.metadata;
        
        if (metadata?.voice_duration) {
          console.log('🎤 Processing voice message transcription...');
          
          // Download the audio file
          const audioResponse = await fetch(note.file_url);
          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
          }
          
          const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
          console.log(`📊 Downloaded audio: ${audioBuffer.length} bytes`);
          
          // Transcribe the audio
          const transcription = await transcribeAudio(audioBuffer, 'voice.ogg');
          console.log(`✅ Transcription completed: ${transcription.substring(0, 100)}...`);
          
          // Update the note with transcription
          await updateNote(note.id, note.user_id, { 
            raw_text: transcription,
            metadata: { ...metadata, transcription_completed: true }
          });
          
          // Send transcription back to Telegram user if available
          if (metadata?.telegram_user_id) {
            try {
              const { sendTelegramTranscription } = await import('@/lib/telegram');
              await sendTelegramTranscription(metadata.telegram_user_id, transcription);
            } catch (notifyError) {
              console.error('Failed to send transcription to Telegram:', notifyError);
              // Don't fail the processing if notification fails
            }
          }
          
          textToProcess = transcription;
          
        } else {
          console.log('📄 File detected but not voice - skipping transcription');
          await logProcessingFailed(logId, 'File processing not yet implemented for this file type');
          return NextResponse.json(
            { error: 'File processing not yet implemented for this file type' },
            { status: 400 }
          );
        }
        
      } catch (transcriptionError) {
        console.error('❌ Transcription failed:', transcriptionError);
        await logProcessingFailed(logId, `Transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : String(transcriptionError)}`);
        await updateNote(note.id, note.user_id, { status: 'error' });
        return NextResponse.json(
          { error: 'Failed to transcribe audio' },
          { status: 500 }
        );
      }
    }
    
    if (!textToProcess) {
      await logProcessingFailed(logId, 'Note has no text to process and no supported file');
      return NextResponse.json(
        { error: 'Note has no text to process and no supported file' },
        { status: 400 }
      );
    }


    // Mark note as processing
    await updateNote(note.id, note.user_id, { status: 'processing' });

    try {
      // Process the note with AI
      console.log(`🤖 Processing text: ${textToProcess.substring(0, 100)}...`);
      const processed = await processNote(textToProcess);
      
      // Update note with summary and language
      await updateNote(note.id, note.user_id, {
        summary: processed.summary,
        language: processed.language,
        status: 'processed'
      });
      
      // Create and link tags
      for (const tagName of processed.tags) {
        try {
          const tag = await createTag(tagName.toLowerCase().trim());
          await linkNoteTag(note.id, tag.id);
        } catch (error) {
          console.error('Error creating/linking tag:', error);
          // Continue with other tags
        }
      }
      
      // Create chunks with embeddings
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
        } catch (error) {
          console.error('Error creating chunk:', error);
          // Continue with other chunks
        }
      }

      // Create tasks from AI extraction
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
          // Continue with other tasks
        }
      }

      // Create calendar events from AI extraction
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
          // Continue with other events
        }
      }
      
      // Extract entities from the note
      let entitiesExtracted = 0;
      try {
        await extractEntitiesFromNote(note.id);
        entitiesExtracted = 1; // We don't get the count back, so just mark as success
      } catch (error) {
        console.error('Error extracting entities:', error);
        // Continue - entity extraction failure shouldn't fail the whole process
      }
      
      const processingTime = Date.now() - startTime;
      await logProcessingComplete(
        logId, 
        `Successfully processed: ${processed.chunks.length} chunks, ${processed.tags.length} tags, ${tasksCreated} tasks, ${eventsCreated} events, entities extracted: ${entitiesExtracted}`,
        processingTime
      );

      return NextResponse.json({
        message: 'Note processed successfully',
        noteId: note.id,
        summary: processed.summary,
        tags: processed.tags,
        language: processed.language,
        chunksCreated: processed.chunks.length,
        tasksCreated,
        eventsCreated,
        entitiesExtracted,
        processingTimeMs: processingTime
      });
      
    } catch (processingError) {
      const processingTime = Date.now() - startTime;
      console.error('Error processing note:', processingError);
      
      if (logId) {
        await logProcessingFailed(
          logId, 
          processingError instanceof Error ? processingError.message : 'Processing failed',
          {
            error: processingError instanceof Error ? processingError.stack : processingError,
            note_length: note.raw_text?.length,
            env_check: {
              has_openai_key: !!process.env.OPENAI_API_KEY,
              openai_key_prefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...'
            }
          },
          processingTime
        );
      }
      
      // Mark note as error
      await updateNote(note.id, note.user_id, {
        status: 'error',
        metadata: { 
          error: processingError instanceof Error ? processingError.message : 'Processing failed' 
        }
      });
      
      return NextResponse.json(
        { error: 'Failed to process note with AI' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Process note error:', error);
    
    if (logId) {
      await logProcessingFailed(
        logId,
        'Internal server error',
        { error: error instanceof Error ? error.stack : error },
        processingTime
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}