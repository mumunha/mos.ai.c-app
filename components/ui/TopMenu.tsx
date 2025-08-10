import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LogoutButton from '@/components/auth/LogoutButton';
import { Settings, Network, Shield } from 'lucide-react';
import { User, isAdmin } from '@/lib/auth';

interface TopMenuProps {
  user?: User | null;
}

export default function TopMenu({ user }: TopMenuProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
              <Image
                src="/img/MOS.AI.C_ICON_SMALL.png"
                alt="MOS•AI•C"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <h1 className="text-xl font-semibold text-gray-900">MOS•AI•C</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/notes/new">
                <Button variant="ghost" size="sm">
                  New Note
                </Button>
              </Link>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  Tasks
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="ghost" size="sm">
                  Search
                </Button>
              </Link>
              <Link href="/tags/edit">
                <Button variant="ghost" size="sm">
                  Tags
                </Button>
              </Link>
              <Link href="/mosaic">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <Network className="h-4 w-4" />
                  <span>Your Mosaic</span>
                </Button>
              </Link>
              <Link href="/integrations">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <Settings className="h-4 w-4" />
                  <span>Integrations</span>
                </Button>
              </Link>
              {user && isAdmin(user) && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1 bg-pink-50 text-pink-600 hover:bg-pink-100">
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </Button>
                </Link>
              )}
            </nav>
            {user && (
              <>
                <span className="text-sm text-gray-600">
                  Welcome, {user.display_name || user.email}
                </span>
                <LogoutButton />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}