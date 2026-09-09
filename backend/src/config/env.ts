import crypto from 'crypto';
import dotenv from 'dotenv';

// Ensure environment variables are loaded regardless of import order.
dotenv.config();

/**
 * Centralized, validated environment/secret loading.
 *
 * Previously the JWT secret was read inline in four different places with three
 * different hard-coded fallbacks ('secret', 'your-secret-key',
 * 'development-secret-...'). That meant a misconfigured deploy could silently
 * verify tokens against a guessable constant, and the issuer/verifier could
 * disagree. This module is the single source of truth.
 *
 * Rules:
 *  - In production, a strong secret MUST be provided via env or the process
 *    refuses to start (fail closed).
 *  - In non-production, if no secret is provided we generate a random
 *    per-process secret (never a guessable literal). Tokens/sessions simply
 *    reset on restart, which is fine for local dev.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Minimum acceptable secret length. HS256 signing keys should carry at least
// 256 bits of entropy; 32 characters is the floor we enforce for env-provided
// secrets so a weak hex/short string can't slip through.
const MIN_SECRET_LENGTH = 32;

function loadSecret(name: string): string {
  const value = process.env[name];

  if (value && value.length >= MIN_SECRET_LENGTH) {
    return value;
  }

  if (isProduction) {
    throw new Error(
      `${name} environment variable is required in production and must be at least ${MIN_SECRET_LENGTH} characters.`
    );
  }

  // Non-production: derive an ephemeral random secret rather than using a
  // predictable hard-coded string.
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn(
    `[env] ${name} is not set (or too short). Using a random ephemeral secret for this process. ` +
      'Set it in your .env for stable sessions.'
  );
  return generated;
}

export const JWT_SECRET: string = loadSecret('JWT_SECRET');
export const SESSION_SECRET: string = loadSecret('SESSION_SECRET');
