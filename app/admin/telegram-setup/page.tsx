import React from 'react';
import { requireAuth, isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TopMenu from '@/components/ui/TopMenu';
import TelegramSetupClient from '@/components/admin/TelegramSetupClient';

export default async function TelegramSetupPage() {
  const user = await requireAuth();
  
  if (!isAdmin(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Telegram Bot Setup</h1>
            <p className="mt-2 text-gray-600">
              Configure your Telegram webhook for production deployment
            </p>
          </div>
          
          <TelegramSetupClient />
        </div>
      </main>
    </div>
  );
}