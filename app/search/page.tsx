import { requireAuth } from '@/lib/auth';
import TopMenu from '@/components/ui/TopMenu';
import SearchInterface from '@/components/search/SearchInterface';

export default async function SearchPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Notes</h1>
          <p className="text-gray-600 mt-2">
            Find information across your knowledge base using AI-powered semantic search
          </p>
        </div>

        <SearchInterface />
      </div>
    </div>
  );
}