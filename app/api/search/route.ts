import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { searchNotes } from '@/lib/models';
import { createEmbedding } from '@/lib/ai';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query: searchQuery, tags, limit = 10, searchType = 'hybrid' } = body;

    if (!searchQuery) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    let results = [];

    if (searchType === 'vector' || searchType === 'hybrid') {
      try {
        // Generate embedding for the query
        const queryEmbedding = await createEmbedding(searchQuery);
        
        // Vector similarity search
        const vectorResults = await query(
          `SELECT DISTINCT n.id, n.title, n.summary, n.raw_text, n.created_at, n.status,
            1 - (c.embedding <=> $2::vector) as similarity
           FROM notes n
           INNER JOIN chunks c ON n.id = c.note_id
           WHERE n.user_id = $1 
             AND 1 - (c.embedding <=> $2::vector) > 0.7
           ORDER BY similarity DESC
           LIMIT $3`,
          [user.id, `[${queryEmbedding.join(',')}]`, limit]
        );
        
        results.push(...vectorResults.rows);
      } catch (error) {
        console.error('Vector search error:', error);
        // Fall back to text search if vector search fails
      }
    }

    if (searchType === 'text' || (searchType === 'hybrid' && results.length === 0)) {
      // Full-text search
      const textResults = await query(
        `SELECT n.id, n.title, n.summary, n.raw_text, n.created_at, n.status,
          ts_rank(to_tsvector('english', 
            COALESCE(n.raw_text, '') || ' ' || 
            COALESCE(n.summary, '') || ' ' || 
            COALESCE(n.title, '')
          ), plainto_tsquery('english', $2)) as rank
         FROM notes n
         WHERE n.user_id = $1 
           AND to_tsvector('english', 
             COALESCE(n.raw_text, '') || ' ' || 
             COALESCE(n.summary, '') || ' ' || 
             COALESCE(n.title, '')
           ) @@ plainto_tsquery('english', $2)
         ORDER BY rank DESC
         LIMIT $3`,
        [user.id, searchQuery, limit]
      );
      
      results.push(...textResults.rows);
    }

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      const tagFilteredResults = await query(
        `SELECT DISTINCT n.id FROM notes n
         INNER JOIN note_tags nt ON n.id = nt.note_id
         INNER JOIN tags t ON nt.tag_id = t.id
         WHERE n.user_id = $1 AND t.name = ANY($2)`,
        [user.id, tags]
      );
      
      const taggedNoteIds = new Set(tagFilteredResults.rows.map((r: any) => r.id));
      results = results.filter(note => taggedNoteIds.has(note.id));
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = Array.from(
      new Map(results.map(note => [note.id, note])).values()
    ).sort((a, b) => {
      const scoreA = a.similarity || a.rank || 0;
      const scoreB = b.similarity || b.rank || 0;
      return scoreB - scoreA;
    });

    // Get tags for each result
    for (const note of uniqueResults) {
      const tagsResult = await query(
        `SELECT t.name FROM tags t
         INNER JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = $1`,
        [note.id]
      );
      note.tags = tagsResult.rows.map((row: any) => row.name);
    }

    return NextResponse.json({
      results: uniqueResults.slice(0, limit),
      query: searchQuery,
      searchType,
      total: uniqueResults.length
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}