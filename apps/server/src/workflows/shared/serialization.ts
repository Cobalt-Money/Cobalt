/**
 * Serializable error info for passing to steps.
 * FatalError and RetryableError from 'workflow' cannot be serialized by devalue,
 * so we extract only the serializable properties.
 */
export interface SerializableError {
  message: string;
  name?: string;
  stack?: string;
  cause?: SerializableError;
}

/**
 * Converts any error to a serializable plain object.
 * Required because FatalError/RetryableError from 'workflow' cannot be serialized by devalue.
 */
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
