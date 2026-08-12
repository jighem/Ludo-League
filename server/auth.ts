import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, execute } from './db';

const JWT_SECRET = process.env.AUTH_SECRET || 'ludo_league_secret_key_jwt_token_2026';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: 'admin' | 'operator' | 'viewer';
  is_active: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuthenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(allowedRoles: Array<'admin' | 'operator' | 'viewer'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied. Required role: ' + allowedRoles.join(', ') });
    }

    next();
  };
}

export async function logAudit(
  req: AuthenticatedRequest,
  action: string,
  entity: string,
  entityId?: string | number,
  details?: any
) {
  try {
    const userId = req.user?.id || null;
    const username = req.user?.username || 'system';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);

    await execute(
      `INSERT INTO audit_logs (user_id, username, action, entity, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, username, action, entity, entityId ? String(entityId) : null, detailsStr, ipAddress]
    );
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}
