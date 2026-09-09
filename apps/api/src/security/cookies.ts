import type { CookieSerializeOptions } from '@fastify/cookie';
import { env } from '../config/env';

export const AUTH_COOKIE_NAME = 'sr_crm_sid';
export const SESSION_COOKIE_NAME = AUTH_COOKIE_NAME;
export const LEGACY_AUTH_COOKIE_NAME = 'sr_crm_session';

/**
 * Standard secure cookie options for session management
 */
export function getCookieOptions(maxAgeSeconds = env.SESSION_TTL_SECONDS): CookieSerializeOptions {
  const isProduction = env.NODE_ENV === 'production';
  // Use explicit COOKIE_SAME_SITE if configured, otherwise default to 'none' in production for Vercel cross-site HTTPS
  const sameSiteSetting: 'lax' | 'strict' | 'none' = env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');

  return {
    path: '/',
    httpOnly: true,
    secure: isProduction || sameSiteSetting === 'none', // SameSite=None requires Secure=true
    sameSite: sameSiteSetting,
    maxAge: maxAgeSeconds,
    signed: false, // Opaque session ID stored in Redis / Session store
  };
}

export function getSessionCookieOptions(): CookieSerializeOptions {
  return getCookieOptions();
}

/**
 * Cookie options for invalidating/clearing session cookie
 */
export function getClearCookieOptions(): CookieSerializeOptions {
  const isProduction = env.NODE_ENV === 'production';
  const sameSiteSetting: 'lax' | 'strict' | 'none' = env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');

  return {
    path: '/',
    httpOnly: true,
    secure: isProduction || sameSiteSetting === 'none',
    sameSite: sameSiteSetting,
    maxAge: 0,
    expires: new Date(0),
  };
}
