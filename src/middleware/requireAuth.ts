import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * requireAuth middleware
 *
 * Reads the session token from the `Authorization: Bearer <token>` header,
 * verifies it against the NextAuth Session table in Postgres, and attaches
 * `req.user = { id, email, tier }` to the request.
 *
 * Returns 401 if the token is missing, invalid, or expired.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7).trim(); // strip "Bearer "

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tier: true,
          },
        },
      },
    });

    if (!session || session.expires < new Date()) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      tier: session.user.tier,
    };

    next();
  } catch (error) {
    console.error('requireAuth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
