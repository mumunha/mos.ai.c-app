'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TelegramSetupClient() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [botInfo, setBotInfo] = useState<any>(null);

  const setupWebhook = async () => {
    setLoading(true);
    setStatus('Setting up webhook...');
    
    try {
      const response = await fetch('/api/telegram/setup', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('✅ Webhook setup successful!');
        setBotInfo(data.bot_info);
        loadWebhookInfo();
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setStatus('❌ Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadWebhookInfo = async () => {
    try {
      const response = await fetch('/api/telegram/setup');
      const data = await response.json();
      
      if (response.ok) {
        setWebhookInfo(data.webhook_info);
        setBotInfo(data.bot_info);
      }
    } catch (error) {
      console.error('Error loading webhook info:', error);
    }
  };

  const deleteWebhook = async () => {
    setLoading(true);
    setStatus('Removing webhook...');
    
    try {
      const response = await fetch('/api/telegram/setup', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('✅ Webhook removed successfully!');
        setWebhookInfo(null);
        loadWebhookInfo();
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setStatus('❌ Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Load info on component mount
  React.useEffect(() => {
    loadWebhookInfo();
  }, []);

  return (
    <div className="space-y-6">
      {/* Bot Info */}
      {botInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🤖 Bot Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Username:</strong> @{botInfo.username}
              </div>
              <div>
                <strong>Name:</strong> {botInfo.first_name}
              </div>
              <div>
                <strong>ID:</strong> {botInfo.id}
              </div>
              <div>
                <strong>Can Join Groups:</strong> {botInfo.can_join_groups ? '✅' : '❌'}
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Test your bot:</strong> <a href={`https://t.me/${botInfo.username}`} target="_blank" rel="noopener noreferrer" className="underline">https://t.me/{botInfo.username}</a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📡 Webhook Status
          </CardTitle>
          <CardDescription>
            Current webhook configuration for your Telegram bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhookInfo ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <strong>URL:</strong> {webhookInfo.url || 'Not set'}
                </div>
                <div>
                  <strong>Status:</strong> {webhookInfo.url ? '✅ Active' : '❌ Not configured'}
                </div>
                <div>
                  <strong>Pending Updates:</strong> {webhookInfo.pending_update_count || 0}
                </div>
                {webhookInfo.last_error_message && (
                  <div className="text-red-600">
                    <strong>Last Error:</strong> {webhookInfo.last_error_message}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={setupWebhook} 
                  disabled={loading}
                  variant={webhookInfo.url ? "outline" : "default"}
                >
                  {loading ? 'Processing...' : (webhookInfo.url ? 'Update Webhook' : 'Setup Webhook')}
                </Button>
                
                {webhookInfo.url && (
                  <Button 
                    onClick={deleteWebhook} 
                    disabled={loading}
                    variant="destructive"
                  >
                    Remove Webhook
                  </Button>
                )}
                
                <Button 
                  onClick={loadWebhookInfo} 
                  disabled={loading}
                  variant="ghost"
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">Loading webhook information...</p>
              <Button onClick={loadWebhookInfo} variant="outline">
                Load Status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Quick Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p><strong>For Production (Railway):</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Make sure your app is deployed to Railway</li>
              <li>Set the TELEGRAM_BOT_TOKEN environment variable</li>
              <li>Click &quot;Setup Webhook&quot; above</li>
              <li>Test by messaging your bot on Telegram</li>
            </ol>
            
            <p className="mt-4"><strong>For Local Development:</strong></p>
            <p className="ml-4 text-muted-foreground">Use <code>npm run bot</code> instead of webhooks</p>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {status && (
        <Card>
          <CardContent className="pt-6">
            <div className={`p-3 rounded-lg ${
              status.includes('✅') ? 'bg-green-50 text-green-800' : 
              status.includes('❌') ? 'bg-red-50 text-red-800' : 
              'bg-blue-50 text-blue-800'
            }`}>
              {status}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}