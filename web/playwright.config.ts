import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.MDV_WEB_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // Start both Next.js (web) and FastAPI (api) for e2e - skip if MDV_SKIP_WEBSERVER=1
  webServer: process.env.MDV_SKIP_WEBSERVER === '1' ? undefined : [
    {
      command: 'bash -lc "docker compose up -d postgres redis && sleep 5 && ../../.venv/bin/alembic -c backend/alembic.ini upgrade head && ../../.venv/bin/python -m backend.scripts.seed_dev && ../../.venv/bin/uvicorn backend.api.main:app --host 127.0.0.1 --port 8000"',
      cwd: '..',
      port: 8000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'bash -lc "npm run build && npm run start:prod"',
      cwd: '.',
      port: 3000,
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

