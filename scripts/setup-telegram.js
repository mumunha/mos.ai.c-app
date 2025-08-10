#!/usr/bin/env node

import fetch from 'node-fetch';
import { config } from 'dotenv';

config({ path: '.env.local' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

async function setupTelegramWebhook() {
  console.log('🔧 Setting up Telegram webhook...');
  
  try {
    // Create webhook URL with token verification
    const webhookToken = TELEGRAM_BOT_TOKEN.slice(-10);
    const webhookUrl = `${BASE_URL}/api/telegram/webhook/${webhookToken}`;
    
    console.log(`📡 Setting webhook URL: ${webhookUrl}`);
    
    // Set webhook
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error('❌ Failed to set webhook:', result.description);
      process.exit(1);
    }
    
    console.log('✅ Webhook set successfully!');
    
    // Get bot info
    const botResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const botInfo = await botResponse.json();
    
    if (botInfo.ok) {
      console.log(`🤖 Bot: @${botInfo.result.username} (${botInfo.result.first_name})`);
      console.log(`📱 Bot ID: ${botInfo.result.id}`);
    }
    
    // Get webhook info to verify
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookInfoResponse.json();
    
    if (webhookInfo.ok) {
      console.log('📊 Webhook Status:');
      console.log(`   URL: ${webhookInfo.result.url}`);
      console.log(`   Pending updates: ${webhookInfo.result.pending_update_count}`);
      console.log(`   Last error: ${webhookInfo.result.last_error_message || 'None'}`);
    }
    
    console.log('');
    console.log('🎉 Telegram bot setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log(`1. Start a chat with your bot: https://t.me/${botInfo.result.username}`);
    console.log('2. Send /start to get your Telegram User ID');
    console.log('3. Link your account in the web app dashboard');
    console.log('4. Start sending messages to save notes!');
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    process.exit(1);
  }
}

async function getWebhookInfo() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('📊 Current webhook status:');
      console.log(JSON.stringify(result.result, null, 2));
    } else {
      console.error('Error getting webhook info:', result.description);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function deleteWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook deleted successfully');
    } else {
      console.error('❌ Error deleting webhook:', result.description);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'setup':
  case undefined:
    setupTelegramWebhook();
    break;
  case 'info':
    getWebhookInfo();
    break;
  case 'delete':
    deleteWebhook();
    break;
  default:
    console.log('Usage: node scripts/setup-telegram.js [setup|info|delete]');
    console.log('  setup (default) - Set up the webhook');
    console.log('  info            - Get current webhook info');
    console.log('  delete          - Delete the webhook');
}