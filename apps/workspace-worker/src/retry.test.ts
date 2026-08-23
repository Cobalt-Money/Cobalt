import { describe, expect, test } from "bun:test";

import { retryOperation } from "./retry";

/* oxlint-disable vitest/prefer-importing-vitest-globals -- This Worker package uses Bun's test runner. */

describe("retryOperation", () => {
  test("retries a transient lifecycle failure within the configured bound", async () => {
    let attempts = 0;
    const result = await retryOperation(
      () => {
        attempts += 1;
        if (attempts < 3) {
          return Promise.reject(new Error("container suddenly disconnected"));
        }
        return Promise.resolve("running");
      },
      { delay: () => Promise.resolve(), maxAttempts: 3 },
    );

    expect(result).toBe("running");
    expect(attempts).toBe(3);
  });

  test("does not retry permanent failures", async () => {
    let attempts = 0;
    const operation = retryOperation(
      () => {
        attempts += 1;
        return Promise.reject(new Error("invalid bucket binding"));
      },
      { delay: () => Promise.resolve(), maxAttempts: 3 },
    );

    expect(operation).rejects.toThrow("invalid bucket binding");
    await operation.catch(() => {});
    expect(attempts).toBe(1);
  });

  test("stops after the maximum number of attempts", async () => {
    let attempts = 0;
    const operation = retryOperation(
      () => {
        attempts += 1;
        return Promise.reject(new Error("OperationInterruptedError: runtime replaced"));
      },
      { delay: () => Promise.resolve(), maxAttempts: 2 },
    );

    expect(operation).rejects.toThrow("runtime replaced");
    await operation.catch(() => {});
    expect(attempts).toBe(2);
  });
});
