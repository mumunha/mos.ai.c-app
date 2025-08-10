'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface TelegramLinkStatus {
  telegram_user_id: number | null;
  is_linked: boolean;
}

export function TelegramLinkSection() {
  const [linkStatus, setLinkStatus] = useState<TelegramLinkStatus | null>(null);
  const [telegramUserId, setTelegramUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load current link status
  useEffect(() => {
    loadLinkStatus();
  }, []);

  const loadLinkStatus = async () => {
    try {
      const response = await fetch('/api/telegram/link');
      if (response.ok) {
        const data = await response.json();
        setLinkStatus(data);
      }
    } catch (error) {
      console.error('Error loading Telegram link status:', error);
    }
  };

  const handleLinkAccount = async () => {
    if (!telegramUserId.trim()) {
      setError('Please enter your Telegram User ID');
      return;
    }

    const userId = parseInt(telegramUserId.trim());
    if (isNaN(userId) || userId <= 0) {
      setError('Please enter a valid Telegram User ID (numbers only)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_user_id: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Telegram account linked successfully!');
        setTelegramUserId('');
        await loadLinkStatus();
      } else {
        setError(data.error || 'Failed to link Telegram account');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkAccount = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/telegram/link', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Telegram account unlinked successfully!');
        await loadLinkStatus();
      } else {
        setError(data.error || 'Failed to unlink Telegram account');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!linkStatus) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Telegram Integration</h3>
        <div className="text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
          T
        </div>
        <h3 className="text-lg font-semibold">Telegram Integration</h3>
      </div>

      {linkStatus.is_linked ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">
              Account linked (ID: {linkStatus.telegram_user_id})
            </span>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ✅ Your Telegram account is successfully linked! You can now send messages, voice notes, documents, and images to your bot to save them as notes.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              <strong>How to use:</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Send text messages for quick note-taking</li>
              <li>Send voice messages for automatic transcription</li>
              <li>Send documents for content extraction</li>
              <li>Send images for OCR and visual analysis</li>
            </ul>
          </div>

          <Button 
            onClick={handleUnlinkAccount}
            disabled={loading}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            {loading ? 'Unlinking...' : 'Unlink Account'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Not linked</span>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-3">
              <strong>To link your Telegram account:</strong>
            </p>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Start a chat with your MOS•AI•C bot on Telegram</li>
              <li>Send the command <code className="bg-blue-100 px-1 rounded">/start</code></li>
              <li>Copy your Telegram User ID from the bot&apos;s response</li>
              <li>Paste the ID below and click &quot;Link Account&quot;</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label htmlFor="telegram-user-id" className="text-sm font-medium">
              Telegram User ID
            </label>
            <div className="flex gap-2">
              <Input
                id="telegram-user-id"
                type="text"
                placeholder="e.g., 123456789"
                value={telegramUserId}
                onChange={(e) => setTelegramUserId(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={handleLinkAccount}
                disabled={loading || !telegramUserId.trim()}
              >
                {loading ? 'Linking...' : 'Link Account'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your Telegram User ID is a number that uniquely identifies your account.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
    </Card>
  );
}