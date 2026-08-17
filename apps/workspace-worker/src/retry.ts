const TRANSIENT_ERROR_PATTERNS = [
  "container suddenly disconnected",
  "connection refused",
  "maximum number of running container instances exceeded",
  "network connection lost",
  "no container instance available",
  "operationinterruptederror",
  "runtime replaced",
];

export const isTransientSandboxError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

interface RetryOptions {
  readonly delay?: (milliseconds: number) => Promise<void>;
  readonly maxAttempts?: number;
  readonly shouldRetry?: (error: unknown) => boolean;
}

const defaultDelay = async (milliseconds: number): Promise<void> => {
  // oxlint-disable-next-line promise/avoid-new -- Web platform timers do not expose a promise API.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

export const retryOperation = async <Result>(
  operation: (attempt: number) => Promise<Result>,
  {
    delay = defaultDelay,
    maxAttempts = 3,
    shouldRetry = isTransientSandboxError,
  }: RetryOptions = {},
): Promise<Result> => {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new Error("maxAttempts must be between 1 and 5");
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      await delay(100 * 2 ** (attempt - 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Sandbox operation failed");
};
