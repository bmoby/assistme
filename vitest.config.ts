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
      {
        test: {
          name: 'core-integration',
          root: path.resolve(__dirname, 'packages/core'),
          environment: 'node',
          pool: 'forks',
          include: ['src/**/*.integration.test.ts'],
          testTimeout: 30000,
          hookTimeout: 120000,
          globalSetup: path.resolve(__dirname, 'test/globalSetup.ts'),
          env: {
            SUPABASE_URL: 'http://127.0.0.1:54321',
            SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
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
          name: 'bot-discord-integration',
          root: path.resolve(__dirname, 'packages/bot-discord'),
          environment: 'node',
          pool: 'forks',
          include: ['src/**/*.integration.test.ts'],
          testTimeout: 30000,
          hookTimeout: 120000,
          globalSetup: path.resolve(__dirname, 'test/globalSetup.ts'),
          env: {
            SUPABASE_URL: 'http://127.0.0.1:54321',
            SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
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
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.e2e.test.ts'],
          globalSetup: path.resolve(__dirname, 'test/e2e/globalSetup.e2e.ts'),
          setupFiles: [path.resolve(__dirname, 'test/e2e/setup.e2e.ts')],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          env: {
            NODE_ENV: 'test',
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
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.integration.test.ts',
        '**/*.e2e.test.ts',
        '**/test/**',
        '**/__mocks__/**',
      ],
      thresholds: {
        // Handlers: primary business logic that must maintain coverage
        'packages/bot-discord/src/handlers/**': {
          statements: 70,
          branches: 65,
          functions: 70,
          lines: 70,
        },
        // AI agents: core formation logic
        'packages/core/src/ai/formation/**': {
          statements: 70,
          branches: 60,
          functions: 70,
          lines: 70,
        },
      },
    },
  },
});
