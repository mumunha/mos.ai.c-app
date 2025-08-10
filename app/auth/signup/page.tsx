import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import SignupForm from '@/components/auth/SignupForm';

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/img/MOS.AI.C_ICON.png"
              alt="MOS•AI•C Icon"
              width={120}
              height={120}
              className="h-auto w-auto"
            />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">
            Create your MOS•AI•C account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start building your intelligent memory companion today
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}