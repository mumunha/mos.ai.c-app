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

    const { id: tagId } = await params;

    // First, check if the tag exists and get notes that will be affected
    const tagCheck = await query(
      `SELECT t.name, COUNT(nt.note_id) as note_count
       FROM tags t
       LEFT JOIN note_tags nt ON t.id = nt.tag_id
       LEFT JOIN notes n ON nt.note_id = n.id
       WHERE t.id = $1 AND (n.user_id = $2 OR n.user_id IS NULL)
       GROUP BY t.id, t.name`,
      [tagId, user.id]
    );

    if (tagCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Delete all note_tags relationships for this tag (only for user's notes)
    await query(
      `DELETE FROM note_tags 
       WHERE tag_id = $1 AND note_id IN (
         SELECT id FROM notes WHERE user_id = $2
       )`,
      [tagId, user.id]
    );

    // Delete the tag if it's no longer used by any notes
    await query(
      `DELETE FROM tags 
       WHERE id = $1 AND NOT EXISTS (
         SELECT 1 FROM note_tags WHERE tag_id = $1
       )`,
      [tagId]
    );

    // Revalidate the dashboard to refresh tag data
    revalidatePath('/dashboard');

    return NextResponse.json({ 
      success: true, 
      message: `Tag "${tagCheck.rows[0].name}" removed from ${tagCheck.rows[0].note_count} notes` 
    });

  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}