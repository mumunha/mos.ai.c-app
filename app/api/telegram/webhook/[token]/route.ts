import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  console.log(`🚀 [${requestId}] ===== TELEGRAM WEBHOOK START =====`);
  console.log(`🕒 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`📍 [${requestId}] Request URL: ${request.url}`);
  console.log(`🔗 [${requestId}] Headers:`, Object.fromEntries(request.headers.entries()));
  
  try {
    const { token } = await params;
    
    // Log request details
    const body = await request.text();
    console.log(`📨 [${requestId}] Raw body length: ${body.length} chars`);
    console.log(`📋 [${requestId}] Webhook body: ${body}`);
    console.log(`🔑 [${requestId}] Token param: ${token}`);
    
    // Parse the body to understand the update
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      console.log(`📊 [${requestId}] Update ID: ${parsedBody.update_id || 'N/A'}`);
      console.log(`👤 [${requestId}] From user: ${parsedBody.message?.from?.id || 'N/A'}`);
      console.log(`💬 [${requestId}] Message type: ${Object.keys(parsedBody.message || {}).filter(k => k !== 'message_id' && k !== 'from' && k !== 'chat' && k !== 'date').join(', ') || 'unknown'}`);
    } catch (e) {
      console.error(`❌ [${requestId}] Failed to parse webhook body:`, e instanceof Error ? e.message : String(e));
    }
    
    // Verify the request is from Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error(`❌ [${requestId}] Bot token not configured in environment`);
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    // Simple token verification
    const expectedToken = botToken.slice(-10);
    console.log(`🔍 [${requestId}] Expected token: ${expectedToken}`);
    console.log(`🔍 [${requestId}] Received token: ${token}`);
    
    if (token !== expectedToken) {
      console.error(`❌ [${requestId}] Token mismatch - unauthorized request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ [${requestId}] Token verified successfully`);

    // Create new request with the body we already read
    const newRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: body
    });

    console.log(`📞 [${requestId}] Importing telegram webhook handler...`);
    
    // Dynamically import telegram webhook to avoid build-time bot token access
    const { telegramWebhook } = await import('@/lib/telegram');
    console.log(`✅ [${requestId}] Telegram handler imported successfully`);
    
    console.log(`🔄 [${requestId}] Calling telegram webhook handler...`);
    const handlerStartTime = Date.now();
    
    const response = await telegramWebhook(newRequest);
    
    const handlerEndTime = Date.now();
    console.log(`✅ [${requestId}] Telegram handler completed in ${handlerEndTime - handlerStartTime}ms`);
    
    // Log response details
    console.log(`📤 [${requestId}] Response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`📤 [${requestId}] Response body: ${responseText}`);
    
    // Create new response with the same content
    const finalResponse = new Response(responseText, {
      status: response.status,
      headers: response.headers
    });
    
    const endTime = Date.now();
    console.log(`🎉 [${requestId}] Total webhook processing time: ${endTime - startTime}ms`);
    console.log(`🏁 [${requestId}] ===== TELEGRAM WEBHOOK END =====`);
    
    return finalResponse;
  } catch (error) {
    const endTime = Date.now();
    console.error(`💥 [${requestId}] CRITICAL ERROR in webhook:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error',
      processingTime: `${endTime - startTime}ms`
    });
    console.error(`🚨 [${requestId}] ===== TELEGRAM WEBHOOK FAILED =====`);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      requestId: requestId 
    }, { status: 500 });
  }
}

// Also handle GET for webhook setup verification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  const expectedToken = botToken.slice(-10);
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ status: 'Webhook endpoint active' });
}