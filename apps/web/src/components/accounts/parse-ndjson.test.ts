import { describe, expect, it } from "vitest";

import { parseNdjson } from "./parse-ndjson";

describe("parseNdjson", () => {
  it("parses a single complete line", () => {
    const { events, rest } = parseNdjson<{ n: number }>('{"n":1}\n');
    expect(events).toStrictEqual([{ n: 1 }]);
    expect(rest).toBe("");
  });

  it("parses multiple complete lines in one buffer", () => {
    const { events, rest } = parseNdjson<{ n: number }>(
      '{"n":1}\n{"n":2}\n{"n":3}\n'
    );
    expect(events).toStrictEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(rest).toBe("");
  });

  it("leaves a partial trailing line in rest", () => {
    const { events, rest } = parseNdjson<{ n: number }>('{"n":1}\n{"n":2');
    expect(events).toStrictEqual([{ n: 1 }]);
    expect(rest).toBe('{"n":2');
  });

  it("skips empty lines", () => {
    const { events, rest } = parseNdjson<{ n: number }>(
      '\n{"n":1}\n\n{"n":2}\n'
    );
    expect(events).toStrictEqual([{ n: 1 }, { n: 2 }]);
    expect(rest).toBe("");
  });

  it("returns nothing for an empty buffer", () => {
    const { events, rest } = parseNdjson<{ n: number }>("");
    expect(events).toStrictEqual([]);
    expect(rest).toBe("");
  });

  it("preserves a buffer with no newline as entirely rest", () => {
    const { events, rest } = parseNdjson<{ n: number }>('{"n":1');
    expect(events).toStrictEqual([]);
    expect(rest).toBe('{"n":1');
  });

  it("treats a mid-object split as a partial line and preserves prior events", () => {
    const { events, rest } = parseNdjson<{ n: number }>(
      '{"n":1}\n{"incomplete":'
    );
    expect(events).toStrictEqual([{ n: 1 }]);
    expect(rest).toBe('{"incomplete":');
  });
});
