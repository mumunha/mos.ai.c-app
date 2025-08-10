import { requireAuth } from '@/lib/auth';
import TopMenu from '@/components/ui/TopMenu';
import DebugDashboard from '@/components/debug/DebugDashboard';

export default async function DebugPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Debug Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor AI processing, logs, and system health
          </p>
        </div>

        <DebugDashboard />
      </div>
    </div>
  );
}