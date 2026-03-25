import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENV_PATH = path.resolve(__dirname, '../../../.env.test');

const REQUIRED_VARS = [
  'DISCORD_DEV_BOT_TOKEN',
  'DISCORD_DEV_CLIENT_ID',
  'DISCORD_TEST_USER_BOT_TOKEN',
  'DISCORD_TEST_GUILD_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export interface E2eEnv {
  DISCORD_DEV_BOT_TOKEN: string;
  DISCORD_DEV_CLIENT_ID: string;
  DISCORD_TEST_USER_BOT_TOKEN: string;
  DISCORD_TEST_GUILD_ID: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
}

export function loadE2eEnv(): E2eEnv {
  dotenv.config({ path: ENV_PATH });

  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required E2E env vars: ${missing.join(', ')}\n` +
      `Copy .env.test.example to .env.test and fill in values.`
    );
  }

  // Set defaults for vars that can be placeholder when MSW is active
  process.env['ANTHROPIC_API_KEY'] ??= 'test-placeholder';
  process.env['OPENAI_API_KEY'] ??= 'test-placeholder';
  process.env['NODE_ENV'] = 'test';
  process.env['LOG_LEVEL'] = 'silent';
  // Set DISCORD_* vars that handlers read from env
  process.env['DISCORD_BOT_TOKEN'] = process.env['DISCORD_DEV_BOT_TOKEN'];
  process.env['DISCORD_CLIENT_ID'] = process.env['DISCORD_DEV_CLIENT_ID'];
  process.env['DISCORD_GUILD_ID'] = process.env['DISCORD_TEST_GUILD_ID'];

  return {
    DISCORD_DEV_BOT_TOKEN: process.env['DISCORD_DEV_BOT_TOKEN']!,
    DISCORD_DEV_CLIENT_ID: process.env['DISCORD_DEV_CLIENT_ID']!,
    DISCORD_TEST_USER_BOT_TOKEN: process.env['DISCORD_TEST_USER_BOT_TOKEN']!,
    DISCORD_TEST_GUILD_ID: process.env['DISCORD_TEST_GUILD_ID']!,
    SUPABASE_URL: process.env['SUPABASE_URL']!,
    SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY']!,
    OPENAI_API_KEY: process.env['OPENAI_API_KEY']!,
  };
}
