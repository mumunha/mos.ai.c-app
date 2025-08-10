#!/usr/bin/env node

import fetch from 'node-fetch';

// Railway sets these automatically
const RAILWAY_STATIC_URL = process.env.RAILWAY_STATIC_URL;
const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Determine the base URL
let baseUrl = '';
if (RAILWAY_STATIC_URL) {
  baseUrl = `https://${RAILWAY_STATIC_URL}`;
} else if (RAILWAY_PUBLIC_DOMAIN) {
  baseUrl = `https://${RAILWAY_PUBLIC_DOMAIN}`;
} else {
  console.error('❌ No Railway URL found. Make sure app is deployed to Railway.');
  process.exit(1);
}

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

console.log('🚂 Setting up Telegram webhook for Railway deployment...');
console.log(`📡 Base URL: ${baseUrl}`);

async function setupProductionWebhook() {
  try {
    // Create webhook URL with token verification
    const webhookToken = TELEGRAM_BOT_TOKEN.slice(-10);
    const webhookUrl = `${baseUrl}/api/telegram/webhook/${webhookToken}`;
    
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
    console.log('🎉 Production Telegram bot setup complete!');
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

setupProductionWebhook();