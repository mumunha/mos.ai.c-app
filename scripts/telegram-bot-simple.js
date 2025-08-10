#!/usr/bin/env node

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

console.log('🤖 Starting MOS•AI•C Telegram Bot...');
console.log(`📡 API Base URL: ${BASE_URL}`);

try {
  // Import and get bot after environment is loaded
  const { getBot } = await import('../lib/telegram.js');
  const bot = await getBot();
  
  console.log('🔧 Initializing bot for polling mode...');
  await bot.init();
  console.log('✅ Bot initialized for polling');

  // Graceful shutdown handlers
  process.once('SIGINT', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stop();
    process.exit(0);
  });

  process.once('SIGTERM', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stop();
    process.exit(0);
  });

  // Start the bot with polling
  console.log('🚀 Bot started! Send /start to @Mos_ai_c_bot on Telegram');
  console.log('📱 Bot username: @Mos_ai_c_bot');
  console.log('🔄 Using polling mode (no webhook needed)');
  console.log('⚠️  Make sure your Next.js app is running on http://localhost:3000');

  await bot.start();
  
} catch (error) {
  console.error('❌ Failed to start bot:', error.message);
  process.exit(1);
}