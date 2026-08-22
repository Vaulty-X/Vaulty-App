/**
 * Auth Middleware
 *
 * Minimal JWT bearer-token verification, matching the auth conventions
 * documented in the Backend README (`Authorization: Bearer <access_token>`,
 * `{ success: false, message }` error envelope). No auth module exists
 * yet in this repo, so this is intentionally small and self-contained;
 * once a dedicated auth module lands, routes can switch to importing
 * `requireAuth` from there instead without changing their own code.
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface AccessTokenPayload {
  sub?: string;
  userId?: string;
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Verifies the request's bearer token and attaches `req.user`.
 * Responds 401 for any missing/invalid/expired token, and 500 if the
 * server itself is misconfigured (no `JWT_SECRET`) — failing closed
 * rather than ever treating an unverifiable request as authenticated.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ success: false, message: 'Internal server error' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload;
    const userId = payload.sub ?? payload.userId;

    if (!userId) {
      throw new Error('Token payload missing user id');
    }

    req.user = { id: userId };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
