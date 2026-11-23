import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", env: { DATABASE_URL: "file:./test.db", PAYMENT_PROVIDER: "mock", MOCK_WEBHOOK_SECRET: "test-secret", STORAGE_LOCAL_DIR: "./uploads-test" }, globalSetup: ["./tests/global-setup.ts"], fileParallelism: false, testTimeout: 30000 },
});
