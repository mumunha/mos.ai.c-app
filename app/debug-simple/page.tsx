import { requireAuth } from '@/lib/auth';
import TopMenu from '@/components/ui/TopMenu';

export default async function SimpleDebugPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu user={user} />
        <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Simple Debug Page</h1>
        <p>If you can see this, routing is working!</p>
        <p>User: {user.email}</p>
        
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Environment Check:</h2>
          <ul className="space-y-2">
            <li>Database URL: {process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}</li>
            <li>OpenAI Key: {process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}</li>
            <li>JWT Secret: {process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}