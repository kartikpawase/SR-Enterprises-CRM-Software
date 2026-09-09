import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedisClient } from '../redis/client';
import { getSession, type SessionData } from '../security/session';
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from '../security/cookies';
import { HTTP_STATUS } from '@crm/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionData;
  }
}

/**
 * Fastify PreHandler Hook for Authentication
 * Strictly verifies active Redis session from HTTP-only cookie or Authorization header.
 * Rejects all unauthenticated requests with HTTP 401 Unauthorized.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 1. Extract session token from cookie or Authorization header
  let sessionToken = request.cookies?.[AUTH_COOKIE_NAME] || request.cookies?.[LEGACY_AUTH_COOKIE_NAME];

  if (!sessionToken && request.headers.authorization) {
    const parts = request.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer') {
      sessionToken = parts[1];
    }
  }

  // 2. Reject immediately if no session token was provided
  if (!sessionToken) {
    return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in to access this resource.',
      },
    });
  }

  // 3. Validate session in Redis
  try {
    const redis = getRedisClient();
    const session = await getSession(redis, sessionToken);
    if (session) {
      request.user = session;
      return;
    }
  } catch (error) {
    request.log.error({ error }, 'Session validation error in Redis');
  }

  // 4. Session invalid, revoked, or expired -> Reject with 401
  return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Session has expired or is invalid. Please log in again.',
    },
  });
}
