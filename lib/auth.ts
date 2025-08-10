import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from './database';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = 'auth-token';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  telegram_user_id: bigint | null;
}

export interface AuthToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken;
  } catch (error) {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

// Remove auth cookie
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  const decoded = verifyToken(token);
  if (!decoded) return null;
  
  try {
    const result = await query(
      'SELECT id, email, display_name, telegram_user_id FROM profiles WHERE id = $1',
      [decoded.userId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Require authentication (for server components)
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  return user;
}

// Create user
export async function createUser(
  email: string, 
  password: string, 
  displayName?: string
): Promise<User> {
  const hashedPassword = await hashPassword(password);
  
  const result = await query(
    `INSERT INTO profiles (email, password_hash, display_name) 
     VALUES ($1, $2, $3) 
     RETURNING id, email, display_name, telegram_user_id`,
    [email, hashedPassword, displayName || null]
  );
  
  return result.rows[0];
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const result = await query(
    'SELECT id, email, password_hash, display_name, telegram_user_id FROM profiles WHERE email = $1',
    [email]
  );
  
  const user = result.rows[0];
  if (!user) return null;
  
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;
  
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    telegram_user_id: user.telegram_user_id
  };
}

// Get user by Telegram ID
export async function getUserByTelegramId(telegramUserId: number): Promise<User | null> {
  const result = await query(
    'SELECT id, email, display_name, telegram_user_id FROM profiles WHERE telegram_user_id = $1',
    [telegramUserId]
  );
  
  return result.rows[0] || null;
}

// Link Telegram account
export async function linkTelegramAccount(userId: string, telegramUserId: number): Promise<void> {
  await query(
    'UPDATE profiles SET telegram_user_id = $2 WHERE id = $1',
    [userId, telegramUserId]
  );
}

// Check if user is admin
export function isAdmin(user: User): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || 'mumunha.b@gmail.com';
  return user.email === adminEmail;
}