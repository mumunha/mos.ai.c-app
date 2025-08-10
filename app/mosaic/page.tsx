import { requireAuth } from '@/lib/auth';
import TopMenu from '@/components/ui/TopMenu';
import MosaicClient from '@/components/mosaic/MosaicClient';

// Add revalidation settings
export const revalidate = 0; // Disable caching for this page

export default async function MosaicPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />

      {/* Main Content */}
      <main className="h-[calc(100vh-4rem)]"> {/* Full height minus top menu */}
        <MosaicClient />
      </main>
    </div>
  );
}