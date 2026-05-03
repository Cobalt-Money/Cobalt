// Seed every env var `@cobalt-web/env/server` validates on import, so that
// importing server-data modules in a unit-test context does not blow up the
// t3-env schema. Tests never hit a real database / provider — actions and
// mutations are mocked at the network / DB boundary.
const REQUIRED_ENV: Record<string, string> = {
  APPLE_APP_BUNDLE_IDENTIFIER: "test.bundle.id",
  APPLE_KEY_ID: "test-key-id",
  APPLE_PRIVATE_KEY: "test-private-key",
  APPLE_SERVICE_ID: "test-service-id",
  APPLE_TEAM_ID: "test-team-id",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  GOOGLE_CLIENT_ID: "test-google-client",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
  GOOGLE_IOS_CLIENT_ID: "test-google-ios-client",
  PLAID_CLIENT_ID: "test-plaid-client",
  PLAID_CLIENT_SECRET: "test-plaid-secret",
  SNAPTRADE_CLIENT_ID: "test-snaptrade-client",
  SNAPTRADE_CONSUMER_KEY: "test-snaptrade-key",
  STOCK_NEWS_API_KEY: "test-stock-news",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: "whsec_test_dummy",
};

for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  process.env[key] ??= value;
}
