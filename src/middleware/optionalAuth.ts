import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * optionalAuth middleware
 *
 * Attaches `req.user = { id, email, tier }` if a valid `Authorization: Bearer
 * <token>` header is present and the session is still active. Does NOT block
 * the request when no token is provided or the token is invalid — the route
 * handler must check `req.user` itself.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    next();
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

    if (session && session.expires > new Date()) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        tier: session.user.tier,
      };
    }
  } catch (error) {
    // Log but never block — this is optional auth
    console.error('optionalAuth middleware error:', error);
  }

  next();
}
