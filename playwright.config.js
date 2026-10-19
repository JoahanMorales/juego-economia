const { defineConfig } = require('@playwright/test');

const PORT = process.env.UAK_PORT || 3100;

module.exports = defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${PORT}`, reducedMotion: 'reduce' },
  webServer: {
    command: 'node server.js',
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'projector',
      testMatch: ['host.spec.js', 'flow.spec.js'],
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'phone',
      testMatch: ['play.spec.js'],
      use: { viewport: { width: 390, height: 844 } },
    },
  ],
});
