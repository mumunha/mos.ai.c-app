import { NextRequest, NextResponse } from 'next/server';
import { createUser, generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    try {
      const user = await createUser(email, password, displayName);
      const token = generateToken(user);
      await setAuthCookie(token);

      return NextResponse.json({
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name
        }
      });
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique violation
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}