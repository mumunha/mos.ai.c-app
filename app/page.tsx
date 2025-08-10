import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="flex justify-center mb-8">
          <Image
            src="/img/MOS.AI.C_LOGO.png"
            alt="MOS•AI•C Logo"
            width={400}
            height={120}
            priority
            className="h-auto w-auto max-w-md"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Memory • Organization • Synthesis AI Companion
        </h1>
        <p className="text-xl text-gray-600">
          Your intelligent companion for memory organization and synthesis. Capture ideas via Telegram, web interface, 
          or file upload. Get automatic summaries, tags, and semantic search.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/login">
            <Button size="lg">
              Get Started
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="outline" size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}