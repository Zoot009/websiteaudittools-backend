/**
 * Authentication middleware for API endpoints
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * API Key authentication middleware
 * Checks for API key in headers, query params, or bearer token
 * 
 * Usage:
 * - Header: Authorization: Bearer YOUR_API_KEY
 * - Header: X-API-Key: YOUR_API_KEY
 * - Query: ?apiKey=YOUR_API_KEY
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.API_KEY;

  // If no API key is configured, allow all requests (backward compatibility)
  if (!apiKey) {
    console.warn('⚠️  Warning: API_KEY not set - authentication is disabled');
    return next();
  }

  // Extract API key from various sources
  let providedKey: string | undefined;

  // 1. Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  }

  // 2. Check X-API-Key header
  if (!providedKey) {
    providedKey = req.headers['x-api-key'] as string;
  }

  // 3. Check query parameter
  if (!providedKey) {
    providedKey = req.query.apiKey as string;
  }

  // Validate the API key
  if (!providedKey) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide an API key',
      methods: [
        'Header: Authorization: Bearer YOUR_API_KEY',
        'Header: X-API-Key: YOUR_API_KEY',
        'Query: ?apiKey=YOUR_API_KEY'
      ]
    });
  }

  if (providedKey !== apiKey) {
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  // Authentication successful
  next();
}

/**
 * Optional API Key authentication middleware
 * Only validates if API key is provided, but doesn't require it
 * Useful for rate-limiting authenticated vs unauthenticated users differently
 */
export function optionalApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return next();
  }

  // Extract API key from various sources
  let providedKey: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  }

  if (!providedKey) {
    providedKey = req.headers['x-api-key'] as string;
  }

  if (!providedKey) {
    providedKey = req.query.apiKey as string;
  }

  // If key is provided, validate it
  if (providedKey) {
    if (providedKey === apiKey) {
      (req as any).authenticated = true;
    } else {
      return res.status(403).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }
  }

  next();
}

/**
 * Multi-key authentication middleware
 * Supports multiple API keys for different users/apps
 * Keys should be comma-separated in API_KEYS environment variable
 */
export function requireApiKeyMulti(req: Request, res: Response, next: NextFunction) {
  const apiKeysEnv = process.env.API_KEYS;

  if (!apiKeysEnv) {
    console.warn('⚠️  Warning: API_KEYS not set - authentication is disabled');
    return next();
  }

  const apiKeys = apiKeysEnv.split(',').map(k => k.trim()).filter(Boolean);

  // Extract API key from various sources
  let providedKey: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  }

  if (!providedKey) {
    providedKey = req.headers['x-api-key'] as string;
  }

  if (!providedKey) {
    providedKey = req.query.apiKey as string;
  }

  if (!providedKey) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide an API key'
    });
  }

  if (!apiKeys.includes(providedKey)) {
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  next();
}

/**
 * IP whitelist middleware
 * Only allows requests from specific IP addresses
 * IPs should be comma-separated in ALLOWED_IPS environment variable
 */
export function requireWhitelistedIp(req: Request, res: Response, next: NextFunction) {
  const allowedIpsEnv = process.env.ALLOWED_IPS;

  if (!allowedIpsEnv) {
    console.warn('⚠️  Warning: ALLOWED_IPS not set - IP filtering is disabled');
    return next();
  }

  const allowedIps = allowedIpsEnv.split(',').map(ip => ip.trim()).filter(Boolean);

  // Get client IP (handles proxies)
  const clientIp = 
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  // Check if IP is whitelisted
  const isAllowed = allowedIps.some(allowedIp => {
    // Support for wildcards like 192.168.1.*
    if (allowedIp.includes('*')) {
      const pattern = allowedIp.replace(/\./g, '\\.').replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(clientIp);
    }
    return allowedIp === clientIp;
  });

  if (!isAllowed) {
    console.warn(`🚫 Blocked request from unauthorized IP: ${clientIp}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not authorized to access this resource'
    });
  }

  next();
}
