import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const { tagName } = await request.json();

    if (!tagName) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Verify the note belongs to the user
    const noteCheck = await query(
      'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
      [noteId, user.id]
    );

    if (noteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Find the tag
    const tagResult = await query(
      'SELECT id FROM tags WHERE name = $1',
      [tagName.toLowerCase().trim()]
    );

    if (tagResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const tagId = tagResult.rows[0].id;

    // Remove the tag from this specific note
    const deleteResult = await query(
      'DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2',
      [noteId, tagId]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Tag was not associated with this note' }, { status: 404 });
    }

    // Check if the tag is still used by other notes
    const tagUsageCheck = await query(
      'SELECT COUNT(*) as count FROM note_tags WHERE tag_id = $1',
      [tagId]
    );

    // If the tag is not used by any notes, delete it from the tags table
    if (parseInt(tagUsageCheck.rows[0].count) === 0) {
      await query('DELETE FROM tags WHERE id = $1', [tagId]);
    }

    // Revalidate cache to refresh data
    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);

    return NextResponse.json({ 
      message: `Tag "${tagName}" removed from note successfully`,
      tagDeleted: parseInt(tagUsageCheck.rows[0].count) === 0
    });

  } catch (error) {
    console.error('Error deleting tag from note:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag from note' },
      { status: 500 }
    );
  }
}