import { NextRequest, NextResponse } from 'next/server';
import { getUserByTelegramId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ telegram_id: string }> }
) {
  try {
    const { telegram_id } = await params;
    const telegramUserId = parseInt(telegram_id);
    
    if (isNaN(telegramUserId)) {
      return NextResponse.json(
        { error: 'Invalid Telegram user ID' },
        { status: 400 }
      );
    }

    const user = await getUserByTelegramId(telegramUserId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user data (excluding sensitive information)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      telegram_user_id: user.telegram_user_id
    });

  } catch (error) {
    console.error('Error getting user by Telegram ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}