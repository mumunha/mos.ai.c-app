import { Bot, webhookCallback, InlineKeyboard } from 'grammy';
import { getUserByTelegramId, linkTelegramAccount } from './auth';
import { createNote, searchNotes, createTask, createCalendarEvent, getTasksByUser, getCalendarEventsByUser } from './models';
import { createEmbedding, generateSummaryAndTags } from './ai';
import OpenAI from 'openai';

// Store pending save confirmations
const pendingSaves = new Map<string, { text: string; userId: string; timestamp: number }>();

// AI-powered intent classification
async function classifyMessageIntent(text: string): Promise<'question' | 'note'> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Classify if this message is a QUESTION (user asking for information) or a NOTE (content to save).

QUESTION indicators:
- Starts with question words (what, how, when, where, why, who, can, could, would, should, is, are, do, does)
- Contains question marks
- Asks for information, explanation, or help
- Requests search or retrieval

NOTE indicators:
- Statements of fact or information
- Personal thoughts, ideas, observations
- Meeting notes, reminders, or documentation
- Content that should be saved for later reference

Respond with only "question" or "note" (lowercase).`
        },
        {
          role: 'user',
          content: text.slice(0, 500) // Limit context for classification
        }
      ],
      temperature: 0.1,
      max_completion_tokens: 10
    });

    const result = response.choices[0].message.content?.toLowerCase().trim();
    return result === 'question' ? 'question' : 'note';
  } catch (error) {
    console.error('Error classifying intent:', error);
    // Default to note if classification fails
    return 'note';
  }
}

// Analyze text for task/event suggestions
async function analyzeForTaskEventSuggestions(text: string): Promise<{
  hasTasks: boolean;
  hasEvents: boolean;
  suggestions: string[];
}> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this text and identify if it contains actionable tasks or calendar events that the user might want to track separately.

Look for:
TASKS:
- Action items, to-dos, things to complete
- Deadlines and deliverables
- Follow-up actions
- Assignments or responsibilities

EVENTS:
- Meetings, appointments, calls
- Specific dates and times mentioned
- Scheduled activities
- Events with location/time info

Respond in JSON format:
{
  "hasTasks": boolean,
  "hasEvents": boolean,
  "suggestions": ["suggestion1", "suggestion2"]
}

Keep suggestions concise (1-2 sentences each). Only suggest if there are clear, actionable items.`
        },
        {
          role: 'user',
          content: text.slice(0, 1000)
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 300
    });

    const content = response.choices[0].message.content;
    if (!content) return { hasTasks: false, hasEvents: false, suggestions: [] };

    try {
      const result = JSON.parse(content);
      return {
        hasTasks: result.hasTasks || false,
        hasEvents: result.hasEvents || false,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      };
    } catch (parseError) {
      return { hasTasks: false, hasEvents: false, suggestions: [] };
    }
  } catch (error) {
    console.error('Error analyzing for suggestions:', error);
    return { hasTasks: false, hasEvents: false, suggestions: [] };
  }
}

// Answer questions using search + LLM
async function answerQuestion(question: string, userId: string): Promise<string> {
  try {
    console.log(`🔍 Answering question: ${question.substring(0, 50)}...`);
    
    // Search for relevant notes
    const searchEmbedding = await createEmbedding(question);
    const searchResults = await searchNotes(userId, question, searchEmbedding, 5);
    
    console.log(`📚 Found ${searchResults.length} relevant notes for question`);
    
    if (searchResults.length === 0) {
      return `I couldn't find any relevant information in your notes to answer: "${question}"\n\nTry asking about topics you've previously saved, or save some notes first!`;
    }
    
    // Prepare context from search results
    const context = searchResults.map((note, index) => 
      `[${index + 1}] ${note.title || 'Untitled'}\n${note.summary || note.raw_text?.substring(0, 200) || 'No content'}...`
    ).join('\n\n');
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant helping a user find information from their personal knowledge base. Answer their question using the provided context from their saved notes.

Guidelines:
- Provide a helpful, direct answer based on the context
- Reference specific notes when relevant (use note titles/numbers)
- If the context doesn't fully answer the question, say so
- Keep responses concise but informative
- Be conversational and helpful`
        },
        {
          role: 'user',
          content: `Question: ${question}

Context from your notes:
${context}`
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 500
    });

    const answer = response.choices[0].message.content || 'I could not generate an answer.';
    
    // Add note references at the end
    const noteRefs = searchResults.map((note, index) => 
      `[${index + 1}] ${note.title || `Note ${note.id.substring(0, 8)}`}`
    ).join('\n');
    
    return `${answer}\n\n📚 **Referenced notes:**\n${noteRefs}`;
    
  } catch (error) {
    console.error('Error answering question:', error);
    return 'Sorry, I encountered an error while searching for an answer. Please try rephrasing your question.';
  }
}

// Send message with inline keyboard
async function sendTelegramMessageWithKeyboard(chatId: number, text: string, keyboard?: any): Promise<void> {
  const BOT_TOKEN = getBotToken();
  
  try {
    console.log(`📤 Sending message with keyboard to chat ${chatId}: ${text.substring(0, 50)}...`);
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    console.log(`✅ Message with keyboard sent successfully to chat ${chatId}`);
  } catch (error) {
    console.error(`❌ Failed to send message with keyboard to chat ${chatId}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Answer callback query
async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const BOT_TOKEN = getBotToken();
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || undefined
      })
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    console.log('✅ Callback query answered successfully');
  } catch (error) {
    console.error('❌ Failed to answer callback query:', error instanceof Error ? error.message : String(error));
  }
}

// Ask user for save confirmation with task/event suggestions
async function askSaveConfirmation(text: string, telegramUserId: number, userId: string): Promise<void> {
  const confirmationId = Math.random().toString(36).substring(2, 15);
  
  // Store pending save with expiration
  pendingSaves.set(confirmationId, {
    text,
    userId,
    timestamp: Date.now()
  });
  
  // Clean up expired saves (older than 5 minutes)
  const now = Date.now();
  const expiredKeys: string[] = [];
  pendingSaves.forEach((value, key) => {
    if (now - value.timestamp > 5 * 60 * 1000) {
      expiredKeys.push(key);
    }
  });
  expiredKeys.forEach(key => pendingSaves.delete(key));

  // Analyze for task/event suggestions
  const suggestions = await analyzeForTaskEventSuggestions(text);
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Save as Note', callback_data: `save_${confirmationId}` },
        { text: '❌ Discard', callback_data: `discard_${confirmationId}` }
      ]
    ]
  };

  // Add task/event suggestion buttons if detected
  if (suggestions.hasTasks || suggestions.hasEvents) {
    keyboard.inline_keyboard.push([
      { text: '📝 Save + Extract Tasks/Events', callback_data: `save_extract_${confirmationId}` }
    ]);
  }
  
  const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
  let message = `I detected this might be content to save:\n\n"${preview}"\n\n`;
  
  if (suggestions.suggestions.length > 0) {
    message += `🤖 **AI detected:**\n`;
    if (suggestions.hasTasks) message += `✅ Tasks found\n`;
    if (suggestions.hasEvents) message += `📅 Events found\n`;
    message += `\n`;
  }
  
  message += `**What would you like me to do?**`;
  
  await sendTelegramMessageWithKeyboard(telegramUserId, message, keyboard);
}

// Custom API client to avoid AbortSignal issues in serverless
async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const BOT_TOKEN = getBotToken();
  
  try {
    console.log(`📤 Sending message to chat ${chatId}: ${text.substring(0, 50)}...`);
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    console.log(`✅ Message sent successfully to chat ${chatId}`);
  } catch (error) {
    console.error(`❌ Failed to send message to chat ${chatId}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

function getBotToken(): string {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }
  return BOT_TOKEN;
}

// Helper function to trigger AI processing using shared processor
async function triggerAIProcessing(noteId: string): Promise<void> {
  try {
    const { processNoteById } = await import('./note-processor');
    const result = await processNoteById(noteId, 'telegram');
    
    if (!result.success) {
      console.error(`❌ [Telegram] Processing failed for note ${noteId}: ${result.message}`);
    }
  } catch (error) {
    console.error('❌ [Telegram] Error triggering AI processing:', error);
  }
}

// Store bot info to avoid repeated API calls
let _botInfo: any = null;

async function getBotInfo(): Promise<any> {
  if (_botInfo) {
    console.log('💾 Using cached bot info');
    return _botInfo;
  }
  
  console.log('🔧 Fetching bot info from Telegram API...');
  const BOT_TOKEN = getBotToken();
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    _botInfo = result.result;
    console.log('✅ Bot info fetched and cached:', _botInfo.username);
    return _botInfo;
  } catch (error) {
    console.error('❌ Failed to fetch bot info:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function getBot(): Promise<Bot> {
  const initStartTime = Date.now();
  console.log('🚀 Creating fresh bot instance for webhook...');
  
  const tokenStartTime = Date.now();
  const BOT_TOKEN = getBotToken();
  console.log('🔑 Bot token acquired in', Date.now() - tokenStartTime, 'ms');
  
  // Get bot info manually to avoid hanging init()
  const infoStartTime = Date.now();
  const botInfo = await getBotInfo();
  console.log('📋 Bot info acquired in', Date.now() - infoStartTime, 'ms');
  
  const botCreateStartTime = Date.now();
  
  // Create bot with pre-fetched bot info - no init() needed!
  const bot = new Bot(BOT_TOKEN, { botInfo });
  console.log('🤖 Bot object created in', Date.now() - botCreateStartTime, 'ms');
  
  const handlersStartTime = Date.now();
  setupBotHandlers(bot);
  console.log('⚙️ Bot handlers setup in', Date.now() - handlersStartTime, 'ms');
  
  const totalTime = Date.now() - initStartTime;
  console.log('🎉 Bot ready in', totalTime, 'ms (no init() call needed)');
  
  return bot;
}

function setupBotHandlers(bot: Bot) {
  // Bot commands and handlers
  bot.command('start', async (ctx) => {
  const cmdId = Math.random().toString(36).substring(2, 8);
  console.log(`🚀 [${cmdId}] /start command received from user:`, ctx.from?.id, 'at', new Date().toISOString());
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) {
    console.error(`❌ [${cmdId}] No user ID in /start command`);
    return;
  }

  try {
    console.log(`🔍 [${cmdId}] Looking up user for Telegram ID:`, telegramUserId);
    const user = await getUserByTelegramId(telegramUserId);
    console.log(`👤 [${cmdId}] User lookup result:`, user ? `Found: ${user.email}` : 'Not found');
    
    if (user) {
      console.log(`✅ [${cmdId}] Sending welcome back message to linked user`);
      await sendTelegramMessage(telegramUserId,
        `Welcome back! Your account is already linked. You can send me:\n` +
        `- Text messages to save as notes\n` +
        `- Voice messages for transcription\n` +
        `- Documents and images\n` +
        `- Links for content extraction\n\n` +
        `Use /help for more commands.`
      );
      console.log(`📤 [${cmdId}] Welcome back message sent successfully`);
    } else {
      console.log(`📝 [${cmdId}] Sending account linking instructions to new user`);
      await sendTelegramMessage(telegramUserId,
        `Welcome to MOS•AI•C! 🤖\n\n` +
        `To use this bot, you need to link your Telegram account to your MOS•AI•C profile.\n\n` +
        `Please visit your profile settings in the web app and use this code to link your account:\n` +
        `**${telegramUserId}**\n\n` +
        `After linking, you'll be able to save content directly through this chat!`
      );
      console.log(`📤 [${cmdId}] Linking instructions sent successfully`);
    }
  } catch (error) {
    console.error(`❌ [${cmdId}] Error in /start command:`, error instanceof Error ? error.message : String(error));
    try {
      await sendTelegramMessage(telegramUserId, 'Sorry, there was an error processing your request. Please try again.');
    } catch (replyError) {
      console.error(`❌ [${cmdId}] Failed to send error message:`, replyError instanceof Error ? replyError.message : String(replyError));
    }
  }
});

  bot.command('help', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;
  
  await sendTelegramMessage(telegramUserId,
    `🤖 MOS•AI•C Bot Commands:\n\n` +
    `/start - Start the bot and get linking instructions\n` +
    `/help - Show this help message\n` +
    `/status - Check your account status\n` +
    `/task [title] - Create a new task quickly\n` +
    `/event [title] - Create a new calendar event\n` +
    `/agenda - View your upcoming tasks and events\n\n` +
    `**What you can send me:**\n` +
    `📝 Text messages - Saved as notes with AI processing\n` +
    `🎤 Voice messages - Transcribed and saved\n` +
    `📄 Documents - Extracted and processed\n` +
    `🖼️ Images - OCR and visual analysis\n` +
    `🔗 Links - Content extraction and summarization\n` +
    `✅ Tasks and 📅 Events are automatically extracted from your content!`
  );
});

  bot.command('status', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  const user = await getUserByTelegramId(telegramUserId);
  
  if (user) {
    await sendTelegramMessage(telegramUserId,
      `✅ Account Status: **Linked**\n` +
      `📧 Email: ${user.email}\n` +
      `👤 Display Name: ${user.display_name || 'Not set'}\n\n` +
      `You can now send content to be processed and saved!`
    );
  } else {
    await sendTelegramMessage(telegramUserId,
      `❌ Account Status: **Not Linked**\n\n` +
      `Please use code **${telegramUserId}** to link your account in the web app.`
    );
  }
});

  bot.command('task', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await sendTelegramMessage(telegramUserId, 'Please link your account first using /start command.');
    return;
  }

  try {
    const taskTitle = ctx.message?.text?.replace('/task', '').trim();
    
    if (!taskTitle) {
      await sendTelegramMessage(telegramUserId,
        `Usage: /task [task title]\n\n` +
        `Example: /task Review quarterly report by Friday\n\n` +
        `The task will be created with medium priority. You can edit details in the web app.`
      );
      return;
    }

    const task = await createTask({
      user_id: user.id,
      title: taskTitle,
      priority: 'medium',
      source_type: 'manual',
      metadata: { created_via: 'telegram_command' }
    });

    await sendTelegramMessage(telegramUserId,
      `✅ Task created successfully!\n\n` +
      `📝 **Title:** ${task.title}\n` +
      `🎯 **Priority:** ${task.priority}\n` +
      `📊 **Status:** ${task.status}\n` +
      `🆔 **Task ID:** ${task.id.substring(0, 8)}...\n\n` +
      `Use the web app to add due dates, descriptions, and more details.`
    );
  } catch (error) {
    console.error('Error creating task via Telegram:', error);
    await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error creating your task.');
  }
});

  bot.command('event', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await sendTelegramMessage(telegramUserId, 'Please link your account first using /start command.');
    return;
  }

  const eventTitle = ctx.message?.text?.replace('/event', '').trim();
  
  if (!eventTitle) {
    await sendTelegramMessage(telegramUserId,
      `Usage: /event [event title]\n\n` +
      `Example: /event Team meeting tomorrow 2pm\n\n` +
      `This will create a basic event. Use the web app to set specific times, locations, and details.`
    );
    return;
  }

  try {
    // For now, create a basic all-day event for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM

    const event = await createCalendarEvent({
      user_id: user.id,
      title: eventTitle,
      start_datetime: tomorrow,
      all_day: false,
      status: 'confirmed',
      source_type: 'manual',
      metadata: { created_via: 'telegram_command' }
    });

    await sendTelegramMessage(telegramUserId,
      `📅 Event created successfully!\n\n` +
      `📝 **Title:** ${event.title}\n` +
      `📅 **Date:** ${new Date(event.start_datetime).toLocaleDateString()}\n` +
      `🕘 **Time:** ${new Date(event.start_datetime).toLocaleTimeString()}\n` +
      `📊 **Status:** ${event.status}\n` +
      `🆔 **Event ID:** ${event.id.substring(0, 8)}...\n\n` +
      `Use the web app to adjust time, add location, and more details.`
    );
  } catch (error) {
    console.error('Error creating event via Telegram:', error);
    await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error creating your event.');
  }
});

  bot.command('agenda', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await sendTelegramMessage(telegramUserId, 'Please link your account first using /start command.');
    return;
  }

  try {
    // Get upcoming tasks (next 7 days)
    const tasks = await getTasksByUser(user.id, undefined, 10);
    const pendingTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress');

    // Get upcoming events (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const events = await getCalendarEventsByUser(user.id, new Date(), nextWeek, 10);

    let agendaText = `📋 **Your Agenda**\n\n`;

    // Add pending tasks
    if (pendingTasks.length > 0) {
      agendaText += `✅ **Pending Tasks:**\n`;
      pendingTasks.slice(0, 5).forEach(task => {
        const dueDateText = task.due_date 
          ? ` (due ${new Date(task.due_date).toLocaleDateString()})`
          : '';
        agendaText += `• ${task.title}${dueDateText}\n`;
      });
      if (pendingTasks.length > 5) {
        agendaText += `... and ${pendingTasks.length - 5} more tasks\n`;
      }
      agendaText += '\n';
    }

    // Add upcoming events
    if (events.length > 0) {
      agendaText += `📅 **Upcoming Events:**\n`;
      events.slice(0, 5).forEach(event => {
        const date = new Date(event.start_datetime);
        const dateText = event.all_day 
          ? date.toLocaleDateString()
          : `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        agendaText += `• ${event.title} - ${dateText}\n`;
      });
      if (events.length > 5) {
        agendaText += `... and ${events.length - 5} more events\n`;
      }
    }

    if (pendingTasks.length === 0 && events.length === 0) {
      agendaText += `🎉 No pending tasks or upcoming events!\n\nYou're all caught up!`;
    } else {
      agendaText += `\n💡 Use the web app for detailed task and calendar management.`;
    }

    await sendTelegramMessage(telegramUserId, agendaText);
  } catch (error) {
    console.error('Error fetching agenda via Telegram:', error);
    await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error fetching your agenda.');
  }
});

// Handle text messages with intelligent routing
  bot.on('message:text', async (ctx) => {
  const msgId = Math.random().toString(36).substring(2, 8);
  const messageText = ctx.message.text;
  console.log(`📝 [${msgId}] Text message received from user:`, ctx.from?.id, 'Message:', messageText.substring(0, 50) + '...');
  
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`🔍 [${msgId}] Looking up user for Telegram ID:`, telegramUserId);
  const user = await getUserByTelegramId(telegramUserId);
  console.log(`👤 [${msgId}] User lookup result:`, user ? 'Found' : 'Not found');
  
  if (!user) {
    console.log(`❌ [${msgId}] User not linked, sending link message`);
    await sendTelegramMessage(telegramUserId,
      `Please link your account first using /start command.`
    );
    return;
  }

  try {
    // Classify message intent
    console.log(`🤖 [${msgId}] Classifying message intent...`);
    const intent = await classifyMessageIntent(messageText);
    console.log(`🎯 [${msgId}] Detected intent: ${intent}`);

    if (intent === 'question') {
      // Handle as question - search and answer
      console.log(`❓ [${msgId}] Processing as question`);
      await sendTelegramMessage(telegramUserId, 'Searching your notes for an answer... 🔍');
      
      const answer = await answerQuestion(messageText, user.id);
      await sendTelegramMessage(telegramUserId, answer);
      
    } else {
      // Handle as note - ask for save confirmation
      console.log(`📝 [${msgId}] Processing as potential note`);
      await askSaveConfirmation(messageText, telegramUserId, user.id);
    }
    
  } catch (error) {
    console.error(`❌ [${msgId}] Error processing text message:`, error);
    await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error processing your message.');
  }
});

// Get file info using direct API call with retry
async function getFileInfo(fileId: string, maxRetries = 3): Promise<{ file_path: string; file_size: number }> {
  const BOT_TOKEN = getBotToken();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📁 Attempt ${attempt}/${maxRetries} to get file info for:`, fileId);
      
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }
      
      console.log(`✅ File info retrieved successfully on attempt ${attempt}`);
      return result.result;
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Handle voice messages
  bot.on('message:voice', async (ctx) => {
  const voiceId = Math.random().toString(36).substring(2, 8);
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`🎤 [${voiceId}] Voice message received from user:`, telegramUserId);

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await sendTelegramMessage(telegramUserId, 'Please link your account first using /start command.');
    return;
  }

  try {
    await sendTelegramMessage(telegramUserId, 'Processing your voice message... 🎤');

    // Get file info using direct API call
    console.log(`📁 [${voiceId}] Getting file info for:`, ctx.message.voice.file_id);
    const fileInfo = await getFileInfo(ctx.message.voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${getBotToken()}/${fileInfo.file_path}`;
    console.log(`🔗 [${voiceId}] File URL:`, fileUrl);

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
        file_size: fileInfo.file_size,
        date: ctx.message.date
      }
    });

    console.log(`💾 [${voiceId}] Voice note created:`, note.id);

    // Process with AI (including transcription) in background
    triggerAIProcessing(note.id).catch(console.error);

    await sendTelegramMessage(telegramUserId,
      `✅ Voice message saved successfully!\n` +
      `🎤 Duration: ${ctx.message.voice.duration}s\n` +
      `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
      `🤖 Transcription and AI processing started.`
    );
  } catch (error) {
    console.error(`❌ [${voiceId}] Error processing voice message:`, error);
    await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error processing your voice message.');
  }
});

// Handle documents
  bot.on('message:document', async (ctx) => {
  const docId = Math.random().toString(36).substring(2, 8);
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`📄 [${docId}] Document received from user:`, telegramUserId);

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await sendTelegramMessage(telegramUserId, 'Please link your account first using /start command.');
    return;
  }

  try {
    await sendTelegramMessage(telegramUserId, 'Processing your document... 📄');

    const document = ctx.message.document;
    console.log(`📁 [${docId}] Getting file info for document:`, document.file_id);
    
    // Get file info using direct API call
    const fileInfo = await getFileInfo(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${getBotToken()}/${fileInfo.file_path}`;
    console.log(`🔗 [${docId}] Document URL:`, fileUrl);

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

    console.log(`💾 [${docId}] Document note created:`, note.id);

    // Process with AI in background
    triggerAIProcessing(note.id).catch(console.error);

    await sendTelegramMessage(telegramUserId,
      `✅ Document saved successfully!\n` +
      `📄 File: ${document.file_name}\n` +
      `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
      `🤖 Content extraction and AI processing started.`
    );
  } catch (error) {
    console.error(`❌ [${docId}] Error processing document:`, error);
    await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error processing your document.');
  }
});

// Handle photos
  bot.on('message:photo', async (ctx) => {
  const photoId = Math.random().toString(36).substring(2, 8);
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  console.log(`🖼️ [${photoId}] Photo received from user:`, telegramUserId);

  const user = await getUserByTelegramId(telegramUserId);
  if (!user) {
    await sendTelegramMessage(telegramUserId, 'Please link your account first using /start command.');
    return;
  }

  try {
    await sendTelegramMessage(telegramUserId, 'Processing your image... 🖼️');

    // Get the largest photo size
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    console.log(`📁 [${photoId}] Getting file info for photo:`, photo.file_id);
    
    // Get file info using direct API call
    const fileInfo = await getFileInfo(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${getBotToken()}/${fileInfo.file_path}`;
    console.log(`🔗 [${photoId}] Photo URL:`, fileUrl);

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
        file_size: fileInfo.file_size,
        date: ctx.message.date
      }
    });

    console.log(`💾 [${photoId}] Photo note created:`, note.id);

    // Process with AI (including OCR/vision) in background
    triggerAIProcessing(note.id).catch(console.error);

    await sendTelegramMessage(telegramUserId,
      `✅ Image saved successfully!\n` +
      `🖼️ ${ctx.message.caption ? 'With caption' : 'No caption'}\n` +
      `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
      `🤖 Visual analysis and AI processing started.`
    );
  } catch (error) {
    console.error(`❌ [${photoId}] Error processing image:`, error);
    await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error processing your image.');
  }
});

// Handle unknown messages
  bot.on('message', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;
  
  await sendTelegramMessage(telegramUserId,
    `I can process:\n` +
    `📝 Text messages\n` +
    `🎤 Voice messages\n` +
    `📄 Documents\n` +
    `🖼️ Images\n\n` +
    `This message type is not supported yet. Use /help for more info.`
  );
});

  // Handle callback queries (inline keyboard button presses)
  bot.on('callback_query', async (ctx) => {
    const callbackId = Math.random().toString(36).substring(2, 8);
    const callbackData = ctx.callbackQuery.data;
    const telegramUserId = ctx.from?.id;
    
    console.log(`🔘 [${callbackId}] Callback query received:`, callbackData, 'from user:', telegramUserId);
    
    if (!telegramUserId) return;
    
    try {
      // Acknowledge the callback to remove loading state
      await answerCallbackQuery(ctx.callbackQuery.id);
      
      if (callbackData?.startsWith('save_extract_')) {
        const confirmationId = callbackData.replace('save_extract_', '');
        const pendingSave = pendingSaves.get(confirmationId);
        
        if (!pendingSave) {
          console.log(`❌ [${callbackId}] No pending save found for ID:`, confirmationId);
          await sendTelegramMessage(telegramUserId, '❌ Save request expired. Please send your message again.');
          return;
        }
        
        console.log(`💾 [${callbackId}] Saving note with task/event extraction for user:`, pendingSave.userId);
        
        // Create note from pending save
        const note = await createNote({
          user_id: pendingSave.userId,
          title: `Telegram Message - ${new Date().toISOString()}`,
          raw_text: pendingSave.text,
          source_type: 'telegram',
          metadata: {
            telegram_user_id: telegramUserId,
            confirmed_save: true,
            extract_tasks_events: true,
            date: Date.now()
          }
        });

        // Process with AI in background (will extract tasks/events)
        triggerAIProcessing(note.id).catch(console.error);

        await sendTelegramMessage(telegramUserId,
          `✅ Note saved successfully!\n` +
          `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
          `🤖 AI processing started - tasks and events will be extracted automatically!\n` +
          `📱 Use /agenda to see your updated tasks and events.`
        );
        
        // Clean up pending save
        pendingSaves.delete(confirmationId);
        console.log(`🗑️ [${callbackId}] Cleaned up pending save:`, confirmationId);
        
      } else if (callbackData?.startsWith('save_')) {
        const confirmationId = callbackData.replace('save_', '');
        const pendingSave = pendingSaves.get(confirmationId);
        
        if (!pendingSave) {
          console.log(`❌ [${callbackId}] No pending save found for ID:`, confirmationId);
          await sendTelegramMessage(telegramUserId, '❌ Save request expired. Please send your message again.');
          return;
        }
        
        console.log(`💾 [${callbackId}] Saving note for user:`, pendingSave.userId);
        
        // Create note from pending save
        const note = await createNote({
          user_id: pendingSave.userId,
          title: `Telegram Message - ${new Date().toISOString()}`,
          raw_text: pendingSave.text,
          source_type: 'telegram',
          metadata: {
            telegram_user_id: telegramUserId,
            confirmed_save: true,
            date: Date.now()
          }
        });

        // Process with AI in background
        triggerAIProcessing(note.id).catch(console.error);

        await sendTelegramMessage(telegramUserId,
          `✅ Note saved successfully!\n` +
          `📝 Note ID: ${note.id.substring(0, 8)}...\n` +
          `🤖 AI processing started in background.`
        );
        
        // Clean up pending save
        pendingSaves.delete(confirmationId);
        console.log(`🗑️ [${callbackId}] Cleaned up pending save:`, confirmationId);
        
      } else if (callbackData?.startsWith('discard_')) {
        const confirmationId = callbackData.replace('discard_', '');
        
        console.log(`🗑️ [${callbackId}] Discarding save for ID:`, confirmationId);
        pendingSaves.delete(confirmationId);
        
        await sendTelegramMessage(telegramUserId, '❌ Message discarded. It was not saved.');
        
      } else {
        console.log(`❓ [${callbackId}] Unknown callback data:`, callbackData);
        await sendTelegramMessage(telegramUserId, '❌ Unknown action. Please try again.');
      }
      
    } catch (error) {
      console.error(`❌ [${callbackId}] Error handling callback query:`, error);
      await sendTelegramMessage(telegramUserId, '❌ Sorry, there was an error processing your request.');
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error('Telegram bot error:', err);
  });
}

// Send transcription result to Telegram user
async function sendTelegramTranscription(telegramUserId: number, transcription: string): Promise<void> {
  try {
    console.log(`📝 Sending transcription to Telegram user ${telegramUserId}...`);
    
    const preview = transcription.length > 300 ? transcription.substring(0, 300) + '...' : transcription;
    
    await sendTelegramMessage(telegramUserId,
      `🎤 **Voice Transcription Complete!** ✅\n\n` +
      `📝 **Transcribed text:**\n"${preview}"\n\n` +
      `🤖 AI processing (summary, tags, search indexing) will continue in the background.`
    );
    
    console.log(`✅ Transcription sent successfully to Telegram user ${telegramUserId}`);
  } catch (error) {
    console.error(`❌ Failed to send transcription to Telegram user ${telegramUserId}:`, error);
    throw error;
  }
}

// Export bot getter for polling script
export { getBot, sendTelegramTranscription };

// Export webhook handler
export async function telegramWebhook(request: Request): Promise<Response> {
  const webhookId = Math.random().toString(36).substring(2, 15);
  const startTime = Date.now();
  
  console.log(`🎯 [${webhookId}] ===== TELEGRAM HANDLER START =====`);
  console.log(`🕒 [${webhookId}] Handler called at: ${new Date().toISOString()}`);
  
  try {
    console.log(`🤖 [${webhookId}] Getting bot instance...`);
    const botStartTime = Date.now();
    
    const bot = await getBot();
    const botEndTime = Date.now();
    
    console.log(`✅ [${webhookId}] Bot instance ready in ${botEndTime - botStartTime}ms`);
    
    // Parse the webhook update manually
    console.log(`📋 [${webhookId}] Reading request body...`);
    const bodyStartTime = Date.now();
    const body = await request.text();
    const bodyEndTime = Date.now();
    
    console.log(`📊 [${webhookId}] Body read in ${bodyEndTime - bodyStartTime}ms, length: ${body.length}`);
    console.log(`📨 [${webhookId}] Raw body: ${body}`);
    
    let update;
    try {
      const parseStartTime = Date.now();
      update = JSON.parse(body);
      const parseEndTime = Date.now();
      
      console.log(`✅ [${webhookId}] JSON parsed in ${parseEndTime - parseStartTime}ms`);
      console.log(`📊 [${webhookId}] Update details:`, {
        update_id: update.update_id,
        message_id: update.message?.message_id,
        user_id: update.message?.from?.id,
        chat_id: update.message?.chat?.id,
        text: update.message?.text?.substring(0, 50) + (update.message?.text?.length > 50 ? '...' : ''),
        message_type: update.message ? Object.keys(update.message).filter(k => !['message_id', 'from', 'chat', 'date'].includes(k)) : []
      });
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`❌ [${webhookId}] JSON parsing failed:`, errorMsg);
      throw new Error(`Invalid JSON in webhook body: ${errorMsg}`);
    }
    
    // Process the update with the bot
    console.log(`🔄 [${webhookId}] Processing update with bot...`);
    const processStartTime = Date.now();
    
    await bot.handleUpdate(update);
    
    const processEndTime = Date.now();
    console.log(`✅ [${webhookId}] Update processed successfully in ${processEndTime - processStartTime}ms`);
    
    // Return success response to Telegram
    const totalTime = Date.now() - startTime;
    console.log(`🎉 [${webhookId}] Total handler time: ${totalTime}ms`);
    console.log(`🏆 [${webhookId}] ===== TELEGRAM HANDLER SUCCESS =====`);
    
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 [${webhookId}] CRITICAL ERROR in telegram handler:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error',
      totalTime: `${totalTime}ms`
    });
    console.error(`🚨 [${webhookId}] Error details:`, error);
    console.error(`⚠️ [${webhookId}] ===== TELEGRAM HANDLER FAILED =====`);
    
    // Always return a response to prevent Telegram retries
    return new Response(JSON.stringify({ 
      ok: true, 
      error_logged: true,
      handler_id: webhookId 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}