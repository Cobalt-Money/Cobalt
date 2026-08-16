import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  BridgeRequestSchema,
  BridgeResponseSchema,
  CommandRequestSchema,
  ExecutionEventSchema,
  WorkspaceScopeSchema,
} from "./schemas.js";
import { command, event, scope, UUIDS } from "../testing/index.js";

describe("workspace schemas", () => {
  it("round-trips valid scopes, commands, events, and bridge messages", () => {
    expect(Schema.decodeUnknownSync(WorkspaceScopeSchema)(scope())).toStrictEqual(scope());
    expect(Schema.decodeUnknownSync(CommandRequestSchema)(command())).toStrictEqual(command());
    expect(Schema.decodeUnknownSync(ExecutionEventSchema)(event.started())).toStrictEqual(
      event.started(),
    );
    const bridge = { _tag: "WakeWorkspace", requestId: UUIDS.request, scope: scope(), version: 1 };
    expect(Schema.decodeUnknownSync(BridgeRequestSchema)(bridge)).toStrictEqual(bridge);
  });

  it("rejects representative malformed commands and unsupported bridge versions", () => {
    expect(() =>
      Schema.decodeUnknownSync(CommandRequestSchema)({ ...command(), cwd: "relative/path" }),
    ).toThrow(/.+/);
    expect(() =>
      Schema.decodeUnknownSync(BridgeRequestSchema)({
        _tag: "WakeWorkspace",
        requestId: UUIDS.request,
        scope: scope(),
        version: 2,
      }),
    ).toThrow(/Expected/);
  });

  it("round-trips an operation response", () => {
    const response = {
      _tag: "ExecutionAccepted",
      executionId: UUIDS.execution,
      requestId: UUIDS.request,
      version: 1,
    };
    expect(Schema.decodeUnknownSync(BridgeResponseSchema)(response)).toStrictEqual(response);
  });
});
