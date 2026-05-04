type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function serializeJsonb(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? value
      : String(value);
  }
  try {
    return structuredClone(value) as JsonValue;
  } catch (error) {
    console.error("[serializeJsonb] Failed to serialize value:", error);
    return null;
  }
}

export function toDecimalString(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

export function extractDateFromISO(isoString: string): string {
  return isoString.split("T")[0] ?? isoString;
}
