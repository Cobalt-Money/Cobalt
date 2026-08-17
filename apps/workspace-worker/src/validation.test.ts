import { describe, expect, test } from "bun:test";

import {
  buildCommand,
  validateEnvironment,
  validateWorkspacePath,
  validateWorkspaceScope,
} from "./validation";

/* oxlint-disable vitest/prefer-importing-vitest-globals -- This Worker package uses Bun's test runner. */

describe("workspace scope validation", () => {
  test("accepts a non-empty user and UUID workspace", () => {
    expect(
      validateWorkspaceScope({
        userId: "user@example.com",
        workspaceId: "123e4567-e89b-42d3-a456-426614174000",
      }),
    ).toEqual({
      userId: "user@example.com",
      workspaceId: "123e4567-e89b-42d3-a456-426614174000",
    });
  });

  test("rejects invalid or attacker-controlled scope fields", () => {
    expect(() => validateWorkspaceScope({ userId: "", workspaceId: "not-a-uuid" })).toThrow();
    expect(() =>
      validateWorkspaceScope({
        sandboxId: "victim-sandbox",
        userId: "user@example.com",
        workspaceId: "123e4567-e89b-42d3-a456-426614174000",
      }),
    ).toThrow();
  });
});

describe("workspace paths", () => {
  test("allows canonical paths inside the three workspace mounts", () => {
    expect(validateWorkspacePath("/workspace/report.py", "write")).toBe("/workspace/report.py");
    expect(validateWorkspacePath("/mnt/uploads/input.pdf", "read")).toBe("/mnt/uploads/input.pdf");
    expect(validateWorkspacePath("/mnt/outputs/report.pdf", "write")).toBe(
      "/mnt/outputs/report.pdf",
    );
  });

  test("rejects traversal, ambiguous paths, and paths outside the mounts", () => {
    for (const path of [
      "/mnt/uploads/../outputs/stolen.pdf",
      "/mnt/uploads//input.pdf",
      "/mnt/uploads\\input.pdf",
      "/etc/passwd",
      "workspace/file.txt",
    ]) {
      expect(() => validateWorkspacePath(path, "read")).toThrow();
    }
  });

  test("rejects writes to uploads", () => {
    expect(() => validateWorkspacePath("/mnt/uploads/overwrite.pdf", "write")).toThrow(
      "Uploads are read-only",
    );
  });
});

describe("command validation", () => {
  test("quotes argv without permitting argument injection", () => {
    expect(buildCommand(["python3", "-c", "print('safe'); # $(touch /tmp/pwned)"])).toBe(
      "'python3' '-c' 'print('\\''safe'\\''); # $(touch /tmp/pwned)'",
    );
  });

  test("allows only Bash and Python executables", () => {
    expect(buildCommand(["bash", "-lc", "printf ok"])).toContain("'bash'");
    expect(() => buildCommand(["node", "-e", "process.exit()"])).toThrow();
  });

  test("allows only explicitly approved environment variables", () => {
    expect(validateEnvironment({ LANG: "C.UTF-8", PYTHONUNBUFFERED: "1" })).toEqual({
      LANG: "C.UTF-8",
      PYTHONUNBUFFERED: "1",
    });
    expect(() => validateEnvironment({ PATH: "/attacker" })).toThrow("not allowed");
    expect(() => validateEnvironment({ LD_PRELOAD: "/mnt/uploads/evil.so" })).toThrow(
      "not allowed",
    );
  });
});
