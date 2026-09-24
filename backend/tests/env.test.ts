/**
 * Tests for the centralized secret loader (src/config/env.ts).
 *
 * The security-critical contract is "fail closed in production": if a strong
 * JWT_SECRET / SESSION_SECRET is not provided, the process must refuse to start
 * in production, and must never fall back to a guessable literal in dev.
 *
 * env.ts reads process.env and calls dotenv.config() at import time and caches
 * the result, so each case re-imports the module in isolation with a controlled
 * environment. dotenv is mocked to a no-op so a developer's real backend/.env
 * can't leak a secret into the "missing secret" cases.
 */

jest.mock('dotenv', () => ({
  __esModule: true,
  default: { config: () => ({ parsed: {} }) },
  config: () => ({ parsed: {} }),
}));

const STRONG_SECRET = 'a'.repeat(40); // >= 32 chars

function loadEnvModule(env: Record<string, string | undefined>) {
  let mod: typeof import('../src/config/env') | undefined;
  let thrown: Error | undefined;
  jest.isolateModules(() => {
    const prev = { ...process.env };
    // Apply the controlled environment.
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      mod = require('../src/config/env');
    } catch (err) {
      thrown = err as Error;
    } finally {
      process.env = prev;
    }
  });
  return { mod, thrown };
}

describe('config/env secret loader', () => {
  it('throws in production when JWT_SECRET is missing (fail closed)', () => {
    const { mod, thrown } = loadEnvModule({
      NODE_ENV: 'production',
      JWT_SECRET: undefined,
      SESSION_SECRET: STRONG_SECRET,
    });
    expect(mod).toBeUndefined();
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).toMatch(/JWT_SECRET/);
  });

  it('throws in production when a secret is too short', () => {
    const { thrown } = loadEnvModule({
      NODE_ENV: 'production',
      JWT_SECRET: 'short',
      SESSION_SECRET: STRONG_SECRET,
    });
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).toMatch(/at least 32/);
  });

  it('uses the provided strong secret in production', () => {
    const { mod, thrown } = loadEnvModule({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_SECRET,
      SESSION_SECRET: STRONG_SECRET,
    });
    expect(thrown).toBeUndefined();
    expect(mod?.JWT_SECRET).toBe(STRONG_SECRET);
    expect(mod?.SESSION_SECRET).toBe(STRONG_SECRET);
  });

  it('generates a random ephemeral secret in dev when none is provided', () => {
    const { mod, thrown } = loadEnvModule({
      NODE_ENV: 'development',
      JWT_SECRET: undefined,
      SESSION_SECRET: undefined,
    });
    expect(thrown).toBeUndefined();
    // 32 random bytes hex-encoded => 64 chars, and never a guessable literal.
    expect(mod?.JWT_SECRET).toHaveLength(64);
    expect(mod?.JWT_SECRET).not.toBe('secret');
    expect(mod?.JWT_SECRET).not.toBe(mod?.SESSION_SECRET);
  });
});
