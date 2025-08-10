import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, linkTelegramAccount, getUserByTelegramId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { telegram_user_id } = await request.json();
    
    if (!telegram_user_id || typeof telegram_user_id !== 'number') {
      return NextResponse.json({ 
        error: 'Valid telegram_user_id is required' 
      }, { status: 400 });
    }

    // Check if this Telegram ID is already linked to another account
    const existingUser = await getUserByTelegramId(telegram_user_id);
    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json({
        error: 'This Telegram account is already linked to another user'
      }, { status: 409 });
    }

    // Check if current user already has a different Telegram account linked
    if (user.telegram_user_id && user.telegram_user_id !== BigInt(telegram_user_id)) {
      return NextResponse.json({
        error: 'Your account is already linked to a different Telegram account'
      }, { status: 409 });
    }

    // Link the accounts
    await linkTelegramAccount(user.id, telegram_user_id);

    return NextResponse.json({
      success: true,
      message: 'Telegram account linked successfully',
      telegram_user_id
    });

  } catch (error) {
    console.error('Error linking Telegram account:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.telegram_user_id) {
      return NextResponse.json({
        error: 'No Telegram account is currently linked'
      }, { status: 400 });
    }

    // Unlink by setting telegram_user_id to null
    await linkTelegramAccount(user.id, null as any);

    return NextResponse.json({
      success: true,
      message: 'Telegram account unlinked successfully'
    });

  } catch (error) {
    console.error('Error unlinking Telegram account:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      telegram_user_id: user.telegram_user_id ? Number(user.telegram_user_id) : null,
      is_linked: !!user.telegram_user_id
    });

  } catch (error) {
    console.error('Error getting Telegram link status:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}