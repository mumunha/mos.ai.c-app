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

// Import and get bot after environment is loaded
const { getBot } = await import('../lib/telegram.js');
const bot = getBot();

// Remove the duplicate handlers since they're now in the shared module
// Just start the bot with polling
  try {
    const response = await fetch(`${BASE_URL}/api/telegram/user/${telegramUserId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

async function createNote(data) {
  try {
    const response = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create note');
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
}

async function triggerAIProcessing(noteId) {
  try {
    await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ noteId }),
    });
  } catch (error) {
    console.error('Error triggering AI processing:', error);
  }
}

// Bot commands and handlers
bot.command('start', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`📱 /start command from user ${telegramUserId}`);

  const user = await getUserByTelegramId(telegramUserId);
  
  if (user) {
    await ctx.reply(
      `Welcome back! Your account is already linked. You can send me:\n` +
      `- Text messages to save as notes\n` +
      `- Voice messages for transcription\n` +
      `- Documents and images\n` +
      `- Links for content extraction\n\n` +
      `Use /help for more commands.`
    );
  } else {
    await ctx.reply(
      `Welcome to MOS•AI•C! 🤖\n\n` +
      `To use this bot, you need to link your Telegram account to your MOS•AI•C profile.\n\n` +
      `Please visit your profile settings in the web app and use this code to link your account:\n` +
      `**${telegramUserId}**\n\n` +
      `After linking, you'll be able to save content directly through this chat!`
    );
  }
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `🤖 MOS•AI•C Bot Commands:\n\n` +
    `/start - Start the bot and get linking instructions\n` +
    `/help - Show this help message\n` +
    `/status - Check your account status\n\n` +
    `**What you can send me:**\n` +
    `📝 Text messages - Saved as notes with AI processing\n` +
    `🎤 Voice messages - Transcribed and saved\n` +
    `📄 Documents - Extracted and processed\n` +
    `🖼️ Images - OCR and visual analysis\n` +
    `🔗 Links - Content extraction and summarization`
  );
});

bot.command('status', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`📱 /status command from user ${telegramUserId}`);

  const user = await getUserByTelegramId(telegramUserId);
  
  if (user) {
    await ctx.reply(
      `✅ Account Status: **Linked**\n` +
      `📧 Email: ${user.email}\n` +
      `👤 Display Name: ${user.display_name || 'Not set'}\n\n` +
      `You can now send content to be processed and saved!`
    );
  } else {
    await ctx.reply(
      `❌ Account Status: **Not Linked**\n\n` +
      `Please use code **${telegramUserId}** to link your account in the web app.`
    );
  }
});

// Handle text messages
bot.on('message:text', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  // Skip if it's a command
  if (ctx.message.text.startsWith('/')) return;

  console.log(`📝 Text message from user ${telegramUserId}: ${ctx.message.text.substring(0, 50)}...`);

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await ctx.reply(
      `Please link your account first using /start command.`
    );
    return;
  }

  try {
    await ctx.reply('Processing your message... 🔄');

    // Create note from text message
    const note = await createNote({
      user_id: user.id,
      title: `Telegram Message - ${new Date().toISOString()}`,
      raw_text: ctx.message.text,
      source_type: 'telegram',
      metadata: {
        telegram_user_id: telegramUserId,
        message_id: ctx.message.message_id,
        date: ctx.message.date
      }
    });

    // Process with AI in background
    triggerAIProcessing(note.id).catch(console.error);

    await ctx.reply(
      `✅ Message saved successfully!\n` +
      `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
      `🤖 AI processing started in background.`
    );
  } catch (error) {
    console.error('Error processing text message:', error);
    await ctx.reply('❌ Sorry, there was an error processing your message.');
  }
});

// Handle voice messages
bot.on('message:voice', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`🎤 Voice message from user ${telegramUserId}`);

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await ctx.reply('Please link your account first using /start command.');
    return;
  }

  try {
    await ctx.reply('Processing your voice message... 🎤');

    // Get file info
    const fileId = ctx.message.voice.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Create note with voice file
    const note = await createNote({
      user_id: user.id,
      title: `Voice Message - ${new Date().toISOString()}`,
      source_type: 'telegram',
      file_url: fileUrl,
      metadata: {
        telegram_user_id: telegramUserId,
        message_id: ctx.message.message_id,
        voice_duration: ctx.message.voice.duration,
        date: ctx.message.date
      }
    });

    // Process with AI (including transcription) in background
    triggerAIProcessing(note.id).catch(console.error);

    await ctx.reply(
      `✅ Voice message saved successfully!\n` +
      `🎤 Duration: ${ctx.message.voice.duration}s\n` +
      `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
      `🤖 Transcription and AI processing started.`
    );
  } catch (error) {
    console.error('Error processing voice message:', error);
    await ctx.reply('❌ Sorry, there was an error processing your voice message.');
  }
});

// Handle documents
bot.on('message:document', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`📄 Document from user ${telegramUserId}: ${ctx.message.document.file_name}`);

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await ctx.reply('Please link your account first using /start command.');
    return;
  }

  try {
    await ctx.reply('Processing your document... 📄');

    const document = ctx.message.document;
    const fileId = document.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Create note with document
    const note = await createNote({
      user_id: user.id,
      title: document.file_name || `Document - ${new Date().toISOString()}`,
      source_type: 'telegram',
      file_url: fileUrl,
      metadata: {
        telegram_user_id: telegramUserId,
        message_id: ctx.message.message_id,
        file_name: document.file_name,
        file_size: document.file_size,
        mime_type: document.mime_type,
        date: ctx.message.date
      }
    });

    // Process with AI in background
    triggerAIProcessing(note.id).catch(console.error);

    await ctx.reply(
      `✅ Document saved successfully!\n` +
      `📄 File: ${document.file_name}\n` +
      `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
      `🤖 Content extraction and AI processing started.`
    );
  } catch (error) {
    console.error('Error processing document:', error);
    await ctx.reply('❌ Sorry, there was an error processing your document.');
  }
});

// Handle photos
bot.on('message:photo', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`🖼️ Photo from user ${telegramUserId}`);

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await ctx.reply('Please link your account first using /start command.');
    return;
  }

  try {
    await ctx.reply('Processing your image... 🖼️');

    // Get the largest photo size
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Create note with image
    const note = await createNote({
      user_id: user.id,
      title: `Image - ${new Date().toISOString()}`,
      raw_text: ctx.message.caption || undefined,
      source_type: 'telegram',
      file_url: fileUrl,
      metadata: {
        telegram_user_id: telegramUserId,
        message_id: ctx.message.message_id,
        photo_sizes: ctx.message.photo.length,
        caption: ctx.message.caption,
        date: ctx.message.date
      }
    });

    // Process with AI (including OCR/vision) in background
    triggerAIProcessing(note.id).catch(console.error);

    await ctx.reply(
      `✅ Image saved successfully!\n` +
      `🖼️ ${ctx.message.caption ? 'With caption' : 'No caption'}\n` +
      `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
      `🤖 Visual analysis and AI processing started.`
    );
  } catch (error) {
    console.error('Error processing image:', error);
    await ctx.reply('❌ Sorry, there was an error processing your image.');
  }
});

// Handle unknown messages
bot.on('message', async (ctx) => {
  await ctx.reply(
    `I can process:\n` +
    `📝 Text messages\n` +
    `🎤 Voice messages\n` +
    `📄 Documents\n` +
    `🖼️ Images\n\n` +
    `This message type is not supported yet. Use /help for more info.`
  );
});

// Error handler
bot.catch((err) => {
  console.error('🚨 Telegram bot error:', err);
});

// Graceful shutdown
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

bot.start();