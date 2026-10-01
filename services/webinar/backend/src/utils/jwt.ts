import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const serviceRoot = path.resolve(backendRoot, '..');

for (const file of [
  path.resolve(backendRoot, '.env'),
  path.resolve(serviceRoot, '.env'),
  path.resolve(serviceRoot, '.env.production'),
  path.resolve(process.cwd(), '.env.production'),
  path.resolve(process.cwd(), '.env'),
]) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, override: false });
  }
}

function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to at least 32 characters in production`);
  }
  return value || devFallback;
}

const JWT_SECRET = requireSecret('JWT_SECRET', 'dev-only-webinar-access-secret-not-for-production');
const JWT_REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET', 'dev-only-webinar-refresh-secret-not-for-production');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

function normalizePayload(payload: JwtPayload | Record<string, unknown>): JwtPayload {
  return {
    id: String((payload as any).id),
    email: String((payload as any).email || ''),
    role: String((payload as any).role || 'client'),
  };
}

export function generateAccessToken(payload: JwtPayload | Record<string, unknown>): string {
  return jwt.sign(normalizePayload(payload), JWT_SECRET, { expiresIn: JWT_EXPIRY as any });
}

export function generateRefreshToken(payload: JwtPayload | Record<string, unknown>): string {
  return jwt.sign(normalizePayload(payload), JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY as any });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
