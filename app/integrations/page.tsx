import { requireAuth } from '@/lib/auth';
import TopMenu from '@/components/ui/TopMenu';
import { TelegramLinkSection } from '@/components/telegram/TelegramLinkSection';

export const revalidate = 0; // Disable caching for this page

export default async function IntegrationsPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h2>
          <p className="text-gray-600">
            Connect external services to enhance your MOS•AI•C experience
          </p>
        </div>

        {/* Telegram Integration */}
        <div className="mb-8">
          <TelegramLinkSection />
        </div>

        {/* Future integrations placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 More Integrations Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <h4 className="font-medium text-gray-700">📧 Email Integration</h4>
              <p className="text-sm text-gray-500 mt-1">Import emails and convert them to notes</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <h4 className="font-medium text-gray-700">📱 WhatsApp Integration</h4>
              <p className="text-sm text-gray-500 mt-1">Connect WhatsApp for message capture</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <h4 className="font-medium text-gray-700">📄 Google Drive</h4>
              <p className="text-sm text-gray-500 mt-1">Sync documents and files automatically</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <h4 className="font-medium text-gray-700">📅 Google Calendar</h4>
              <p className="text-sm text-gray-500 mt-1">Sync events with your Google Calendar</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}