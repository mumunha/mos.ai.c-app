import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getNoteById, updateNote, createTag, linkNoteTag, createChunk } from '@/lib/models';
import { processNote } from '@/lib/ai';
import { logProcessingStart, logProcessingComplete, logProcessingFailed } from '@/lib/processing-logs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    
    // Get the note with existing tags
    const { query } = await import('@/lib/database');
    const result = await query(`
      SELECT n.*, 
             ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as existing_tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = $1 AND n.user_id = $2
      GROUP BY n.id
    `, [noteId, user.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const note = result.rows[0];
    const existingTags = note.existing_tags || [];
    
    // Start logging
    logId = await logProcessingStart(noteId, 'ai_rerun', `Rerunning AI processing for: ${note.title || 'Untitled'}`);
    
    if (!note.raw_text) {
      await logProcessingFailed(logId, 'Note has no text to process');
      return NextResponse.json(
        { error: 'Note has no text to process' },
        { status: 400 }
      );
    }


    // Mark note as processing
    await updateNote(note.id, note.user_id, { status: 'processing' });

    try {
      // Process the note with AI
      const processed = await processNote(note.raw_text);
      
      // Update note with new summary and language
      await updateNote(note.id, note.user_id, {
        summary: processed.summary,
        language: processed.language,
        status: 'processed'
      });
      
      // Clear existing chunks before creating new ones
      await query('DELETE FROM chunks WHERE note_id = $1', [note.id]);
      
      // Create and link new tags (in addition to existing ones)
      const newTagsAdded = [];
      for (const tagName of processed.tags) {
        const cleanTagName = tagName.toLowerCase().trim();
        
        // Skip if tag already exists for this note
        if (existingTags.includes(cleanTagName)) {
          continue;
        }
        
        try {
          const tag = await createTag(cleanTagName);
          await linkNoteTag(note.id, tag.id);
          newTagsAdded.push(cleanTagName);
        } catch (error) {
          console.error('Error creating/linking tag:', error);
          // Continue with other tags
        }
      }
      
      // Create new chunks with embeddings
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
      
      const processingTime = Date.now() - startTime;
      await logProcessingComplete(
        logId, 
        `Successfully reprocessed: ${processed.chunks.length} chunks, ${newTagsAdded.length} new tags added (${existingTags.length} existing preserved)`,
        processingTime
      );

      // Revalidate cache to refresh data
      revalidatePath('/dashboard');
      revalidatePath(`/notes/${note.id}`);

      return NextResponse.json({
        message: 'Note reprocessed successfully',
        noteId: note.id,
        summary: processed.summary,
        newTags: newTagsAdded,
        existingTagsPreserved: existingTags.length,
        language: processed.language,
        chunksCreated: processed.chunks.length,
        processingTimeMs: processingTime
      });
      
    } catch (processingError) {
      const processingTime = Date.now() - startTime;
      console.error('Error reprocessing note:', processingError);
      
      if (logId) {
        await logProcessingFailed(
          logId, 
          processingError instanceof Error ? processingError.message : 'Reprocessing failed',
          {
            error: processingError instanceof Error ? processingError.stack : processingError,
            note_length: note.raw_text?.length,
            existing_tags_count: existingTags.length
          },
          processingTime
        );
      }
      
      // Mark note as error
      await updateNote(note.id, note.user_id, {
        status: 'error',
        metadata: { 
          error: processingError instanceof Error ? processingError.message : 'Reprocessing failed' 
        }
      });
      
      return NextResponse.json(
        { error: 'Failed to reprocess note with AI' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Rerun process error:', error);
    
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