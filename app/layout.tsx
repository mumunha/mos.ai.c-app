import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MOS•AI•C - Memory Organization Synthesis AI Companion',
  description: 'MOS•AI•C – the Memory-Organization-Synthesis AI Companion for intelligent knowledge management',
  icons: {
    icon: '/img/MOS.AI.C_ICON_SMALL.png',
    apple: '/img/MOS.AI.C_ICON.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  );
}