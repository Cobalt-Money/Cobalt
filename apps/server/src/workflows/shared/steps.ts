export interface SerializableError {
  message: string;
  name?: string;
  stack?: string;
  cause?: SerializableError;
}

export function toSerializableError(error: unknown): SerializableError {
  if (error instanceof Error) {
    const serializable: SerializableError = {
      message: error.message,
      name: error.name,
    };

    if (error.stack) {
      serializable.stack = error.stack;
    }

    if (error.cause) {
      serializable.cause = toSerializableError(error.cause);
    }

    return serializable;
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}

/**
 * Hook for workflow-level exception handling (e.g. future Sentry wiring).
 * NOTE: The error parameter MUST be a SerializableError (use toSerializableError)
 * because FatalError/RetryableError from 'workflow' cannot be serialized by devalue.
 */
export function captureWorkflowExceptionStep(
  _workflow: string,
  _error: SerializableError,
  _context?: Record<string, unknown>
): Promise<void> {
  "use step";

  return Promise.resolve();
}
