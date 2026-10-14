import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Secure Server Secret for HMAC Token Signing
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'rejoy-solar-epc-erp-production-secret-key-2026';

// In-memory token revocation list (e.g. on logout)
const revokedTokens = new Set<string>();

// Rate Limiter Store
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

// Password Reset Tokens Store (token -> { email, expiresAt, used })
interface PasswordResetRecord {
  email: string;
  expiresAt: number;
  used: boolean;
}
const passwordResetTokens = new Map<string, PasswordResetRecord>();

/**
 * Hash password securely using Node.js crypto.scrypt with a cryptographic salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored hash or perform secure legacy verification
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // Modern scrypt format: scrypt$<salt>$<hash>
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const key = parts[2];
    try {
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const keyBuffer = Buffer.from(key, 'hex');
      return crypto.timingSafeEqual(derivedKey, keyBuffer);
    } catch {
      return false;
    }
  }

  // SHA256 format if present
  if (storedHash.startsWith('sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const key = parts[2];
    const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(key));
  }

  // Fallback for legacy plain text passwords in demo/initial state:
  // Using timingSafeEqual to avoid timing side-channels
  try {
    const passBuf = Buffer.from(password);
    const storedBuf = Buffer.from(storedHash);
    if (passBuf.length === storedBuf.length && crypto.timingSafeEqual(passBuf, storedBuf)) {
      return true;
    }
  } catch {
    // Length mismatch or error
  }

  return false;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name?: string;
  role: string;
  customerId?: string;
  employeeId?: string;
  exp: number; // Expiration timestamp in seconds
  iat: number; // Issued at timestamp in seconds
}

/**
 * Generate HMAC-SHA256 Signed Session Token
 */
export function generateToken(payload: Omit<TokenPayload, 'exp' | 'iat'>, expiresInHours: number = 24): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode HMAC-SHA256 Session Token
 */
export function verifyToken(token: string): { valid: boolean; payload?: TokenPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid' };
  }

  if (revokedTokens.has(token)) {
    return { valid: false, error: 'Token has been revoked' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify signature with constant-time comparison
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification failed' };
  }
}

/**
 * Revoke token on logout
 */
export function revokeToken(token: string): void {
  if (token) {
    revokedTokens.add(token);
    // Cleanup old revoked tokens periodically
    if (revokedTokens.size > 10000) {
      revokedTokens.clear();
    }
  }
}

/**
 * Create a single-use, 15-minute expiring password reset token
 */
export function createPasswordResetToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
  passwordResetTokens.set(token, { email: email.toLowerCase().trim(), expiresAt, used: false });
  return token;
}

/**
 * Verify and consume a password reset token
 */
export function verifyPasswordResetToken(token: string): { valid: boolean; email?: string; error?: string } {
  const record = passwordResetTokens.get(token);
  if (!record) {
    return { valid: false, error: 'Invalid password reset token' };
  }
  if (record.used) {
    return { valid: false, error: 'Reset token has already been used' };
  }
  if (Date.now() > record.expiresAt) {
    passwordResetTokens.delete(token);
    return { valid: false, error: 'Reset token has expired' };
  }
  // Mark as used
  record.used = true;
  return { valid: true, email: record.email };
}

/**
 * In-memory sliding-window Rate Limiter Middleware
 */
export function rateLimiter(options: { maxRequests: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl}${req.path}_${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + options.windowMs });
      next();
      return;
    }

    record.count++;
    if (record.count > options.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: retryAfterSec
      });
      return;
    }

    next();
  };
}

/**
 * Extract auth token from Authorization: Bearer <token> or query or header
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const customHeader = req.headers['x-auth-token'];
  if (typeof customHeader === 'string' && customHeader) {
    return customHeader.trim();
  }
  return null;
}

// Extend Request type to hold authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication Middleware: Validates session token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const result = verifyToken(token);
  if (!result.valid || !result.payload) {
    res.status(401).json({ success: false, error: result.error || 'Invalid or expired session token.' });
    return;
  }

  req.user = result.payload;
  next();
}

/**
 * Optional Authentication Middleware: populates req.user if token valid, but allows through
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const result = verifyToken(token);
    if (result.valid && result.payload) {
      req.user = result.payload;
    }
  }
  next();
}

/**
 * RBAC Authorization Middleware: Enforce required roles
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const userRole = req.user.role;
    if (userRole === 'Admin') {
      next(); // Super Admin has override access
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Role "${userRole}" is not authorized for this resource.`
      });
      return;
    }

    next();
  };
}

/**
 * Sanitize input and validate ID format
 */
export function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length > 128) return false;
  return /^[a-zA-Z0-9_\-]+$/.test(id);
}

/**
 * Input sanitization to prevent prototype poisoning and injection
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: any = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Block prototype pollution
    }
    if (typeof val === 'string') {
      clean[key] = val.trim();
    } else if (val && typeof val === 'object') {
      clean[key] = sanitizeObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}
