import { requireAuth } from '@/lib/auth';
import TopMenu from '@/components/ui/TopMenu';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getTagsByUser } from '@/lib/models';

// Add revalidation settings
export const revalidate = 0; // Disable caching for this page

export default async function DashboardPage() {
  const user = await requireAuth();
  const userTags = await getTagsByUser(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">
            Your Memory • Organization • Synthesis AI Companion
          </p>
        </div>

        <DashboardClient tags={userTags} />
      </main>
    </div>
  );
}