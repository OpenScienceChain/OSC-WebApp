import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    API_BASE_URL: '',
    LIVE_DEMO: false,
    USE_STAGING_API: false,
  },
  e2e: {
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.isHeadless) {
          launchOptions.args.push('--window-size=1600,1000');
        }
        return launchOptions;
      });
      return config;
    },
    baseUrl: 'http://localhost:4200',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
});
