import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deterministically search and load environment files
const envLocations = [
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env.production'),
];

for (const p of envLocations) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10)),
  HOST: z.string().default('0.0.0.0'),
  API_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Database
  DATABASE_URL: z
    .string()
    .default('postgres://postgres:postgres@localhost:5432/sr_enterprises_crm'),
  DB_MAX_CONNECTIONS: z
    .string()
    .default(process.env.NODE_ENV === 'production' ? '5' : '10')
    .transform((val) => parseInt(val, 10)),
  DB_IDLE_TIMEOUT_MS: z
    .string()
    .default('30000')
    .transform((val) => parseInt(val, 10)),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Security & Authentication
  COOKIE_SECRET: z
    .string()
    .min(16, 'COOKIE_SECRET must be at least 16 characters')
    .default('dev_cookie_secret_at_least_16_chars_long'),
  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET must be at least 16 characters')
    .default('dev_session_secret_at_least_16_chars_long'),
  SESSION_TTL_SECONDS: z
    .string()
    .default('86400')
    .transform((val) => parseInt(val, 10)),
  MAX_LOGIN_ATTEMPTS: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10)),
  LOCKOUT_DURATION_MINUTES: z
    .string()
    .default('15')
    .transform((val) => parseInt(val, 10)),

  // Optional External Integrations
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),

  // Supabase Database & Persistent Object Storage
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('crm-documents'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  PUBLIC_ANON_KEY: z.string().optional(),
  SERVICE_ROLE_SECREAT: z.string().optional(),

  // Production CORS & Cross-Site Cookies for Vercel <-> Oracle Cloud
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),


  // WhatsApp Business Integration
  WHATSAPP_PROVIDER: z.enum(['META', 'DEV', 'MOCK']).default('META'),
  WHATSAPP_API_URL: z.string().default('https://graph.facebook.com'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().default('sr_enterprises_wa_verify_token'),
  WHATSAPP_WEBHOOK_APP_SECRET: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),

  // Transactional Email / PHPMailer (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().default('tls'),
  SMTP_FROM_EMAIL: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('SR Enterprises'),
  SUPPORT_EMAIL: z.string().default('srenterprises02015@gmail.com'),
  SUPPORT_PHONE: z.string().default('+91 73850 59197'),
  MAIL_DRIVER: z.string().optional(),
  MOCK_MAIL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function parseEnv(customEnv?: Record<string, string | undefined>): EnvConfig {
  const raw = customEnv || process.env;
  const source = { ...raw };

  // Normalize Supabase credentials across naming conventions
  if (!source.SUPABASE_URL && source.NEXT_PUBLIC_SUPABASE_URL) {
    source.SUPABASE_URL = source.NEXT_PUBLIC_SUPABASE_URL;
  }
  if (!source.SUPABASE_SERVICE_ROLE_KEY) {
    source.SUPABASE_SERVICE_ROLE_KEY =
      source.SERVICE_ROLE_SECREAT || (source as any).SERVICE_ROLE_SECRET;
  }
  if (!source.SUPABASE_ANON_KEY) {
    source.SUPABASE_ANON_KEY =
      source.PUBLIC_ANON_KEY || source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }

  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errorIssues = result.error.issues
      .map((issue) => ` - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ Critical Environment Configuration Error:\n${errorIssues}\n`);
    throw new Error(`Environment validation failed:\n${errorIssues}`);
  }

  return result.data;
}

export const env = parseEnv();
