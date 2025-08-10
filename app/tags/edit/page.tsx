import { requireAuth } from '@/lib/auth';
import { getTagsByUser } from '@/lib/models';
import TopMenu from '@/components/ui/TopMenu';
import EditTagsInterface from '@/components/tags/EditTagsInterface';

export default async function EditTagsPage() {
  const user = await requireAuth();
  const userTags = await getTagsByUser(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Tags</h1>
          <p className="text-gray-600 mt-2">
            Manage your tags, change their colors, and delete unused ones
          </p>
        </div>

        <EditTagsInterface initialTags={userTags} />
      </div>
    </div>
  );
}