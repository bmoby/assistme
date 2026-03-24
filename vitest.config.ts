import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: path.resolve(__dirname, 'packages/core'),
          environment: 'node',
          pool: 'forks',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.integration.test.ts', 'src/**/*.e2e.test.ts'],
          env: {
            SUPABASE_URL: 'http://localhost:54321',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-placeholder',
            ANTHROPIC_API_KEY: 'test-anthropic-key-placeholder',
            OPENAI_API_KEY: 'test-openai-key-placeholder',
            LOG_LEVEL: 'silent',
          },
        },
        resolve: {
          alias: {
            '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
          },
        },
      },
      {
        test: {
          name: 'bot-discord',
          root: path.resolve(__dirname, 'packages/bot-discord'),
          environment: 'node',
          pool: 'forks',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.integration.test.ts', 'src/**/*.e2e.test.ts'],
          env: {
            SUPABASE_URL: 'http://localhost:54321',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-placeholder',
            ANTHROPIC_API_KEY: 'test-anthropic-key-placeholder',
            OPENAI_API_KEY: 'test-openai-key-placeholder',
            DISCORD_BOT_TOKEN: 'test-discord-token-placeholder',
            DISCORD_CLIENT_ID: 'test-client-id-placeholder',
            DISCORD_GUILD_ID: 'test-guild-id-placeholder',
            LOG_LEVEL: 'silent',
          },
        },
        resolve: {
          alias: {
            '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.ts'],
    },
  },
});
