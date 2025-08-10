import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getNoteById } from '@/lib/models';
import TopMenu from '@/components/ui/TopMenu';
import NoteForm from '@/components/notes/NoteForm';

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const note = await getNoteById(id, user.id);

  if (!note) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Note</h1>
          <p className="text-gray-600 mt-2">
            Update your note content
          </p>
        </div>

        <NoteForm
          mode="edit"
          initialData={{
            id: note.id,
            title: note.title || '',
            raw_text: note.raw_text || ''
          }}
        />
      </div>
    </div>
  );
}