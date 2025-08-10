import { requireAuth, isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TopMenu from '@/components/ui/TopMenu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Database, Settings, Users } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const user = await requireAuth();
  
  if (!isAdmin(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="mt-2 text-gray-600">
              System administration and configuration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Telegram Webhook Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span>Telegram Integration</span>
                </CardTitle>
                <CardDescription>
                  Configure and manage Telegram bot webhooks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/telegram-setup">
                  <Button className="w-full">
                    Manage Telegram
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Processing Logs Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <span>Processing Logs</span>
                </CardTitle>
                <CardDescription>
                  View AI processing logs and debugging information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/debug">
                  <Button className="w-full" variant="outline">
                    View Debug Logs
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Database Configuration Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  <span>DB Configuration</span>
                </CardTitle>
                <CardDescription>
                  Initialize PostgreSQL database with all tables and extensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/database-setup">
                  <Button className="w-full">
                    Configure Database
                  </Button>
                </Link>
              </CardContent>
            </Card>


            {/* User Management Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>
                  View and manage user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}