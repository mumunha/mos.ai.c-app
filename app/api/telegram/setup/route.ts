import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'TELEGRAM_BOT_TOKEN environment variable not set' 
      }, { status: 500 });
    }

    // Try multiple ways to get the base URL
    let baseUrl = 
      process.env.NEXTAUTH_URL || 
      process.env.VERCEL_URL || 
      process.env.RAILWAY_STATIC_URL ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.NEXT_PUBLIC_APP_URL;

    // If no env var, try to detect from request headers
    if (!baseUrl) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 
                      (host?.includes('localhost') ? 'http' : 'https');
      if (host) {
        baseUrl = `${protocol}://${host}`;
      }
    }

    // Ensure https for production deployments (except localhost)
    if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl.replace(/^https?:\/\//, '')}`;
    }

    if (!baseUrl) {
      return NextResponse.json({ 
        error: 'Could not determine application URL. Please set NEXTAUTH_URL, VERCEL_URL, or RAILWAY_STATIC_URL environment variable' 
      }, { status: 500 });
    }

    // Create webhook URL with token verification
    const webhookToken = token.slice(-10); // Last 10 chars for URL verification
    const webhookUrl = `${baseUrl}/api/telegram/webhook/${webhookToken}`;

    // Set up webhook with Telegram
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: [
          'message',
          'callback_query'
        ]
      })
    });

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json({
        error: 'Failed to set webhook',
        details: result.description
      }, { status: 400 });
    }

    // Get bot info
    const botResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const botInfo = await botResponse.json();

    return NextResponse.json({
      success: true,
      webhook_url: webhookUrl,
      bot_info: botInfo.result,
      message: 'Telegram webhook configured successfully'
    });

  } catch (error) {
    console.error('Error setting up Telegram webhook:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'TELEGRAM_BOT_TOKEN environment variable not set' 
      }, { status: 500 });
    }

    // Get webhook info
    const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const webhookInfo = await webhookResponse.json();

    // Get bot info
    const botResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const botInfo = await botResponse.json();

    return NextResponse.json({
      webhook_info: webhookInfo.result,
      bot_info: botInfo.result
    });

  } catch (error) {
    console.error('Error getting Telegram info:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'TELEGRAM_BOT_TOKEN environment variable not set' 
      }, { status: 500 });
    }

    // Remove webhook
    const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json({
        error: 'Failed to delete webhook',
        details: result.description
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram webhook removed successfully'
    });

  } catch (error) {
    console.error('Error removing Telegram webhook:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}