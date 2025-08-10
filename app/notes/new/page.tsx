import { requireAuth } from '@/lib/auth';
import TopMenu from '@/components/ui/TopMenu';
import NoteForm from '@/components/notes/NoteForm';

export default async function NewNotePage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Note</h1>
          <p className="text-gray-600 mt-2">
            Add content to your MOS•AI•C knowledge base
          </p>
        </div>

        <NoteForm />
      </div>
    </div>
  );
}