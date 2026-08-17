import { PGlite } from "@electric-sql/pglite";
import {
  FileRecordNotFoundError,
  InvalidStateTransitionError,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
} from "@cobalt-web/workspace";
import { fileRecord, scope, UUIDS } from "@cobalt-web/workspace/testing";
import { drizzle } from "drizzle-orm/pglite";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { agentWorkspaces, workspaceFiles } from "@cobalt-web/db/schema/zero-schema";
import { makeWorkspaceMetadataStore } from "./store.js";

const OTHER_USER = "user-2";

const schemaSql = `
  CREATE TABLE "user" ("id" text PRIMARY KEY);
  CREATE TABLE "agent_workspaces" (
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "workspace_id" uuid NOT NULL,
    "provider" text NOT NULL,
    "runtime_id" text,
    "status" text NOT NULL CHECK ("status" IN ('created', 'starting', 'running', 'stopping', 'stopped', 'failed', 'deleted')),
    "sandbox_created_at" timestamptz,
    "sandbox_expires_at" timestamptz,
    "sandbox_last_active_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("user_id", "workspace_id")
  );
  CREATE TABLE "workspace_files" (
    "user_id" text NOT NULL,
    "workspace_id" uuid NOT NULL,
    "file_id" uuid NOT NULL,
    "object_key" text NOT NULL UNIQUE,
    "original_filename" text NOT NULL,
    "mime_type" text NOT NULL,
    "byte_size" bigint NOT NULL CHECK ("byte_size" >= 0),
    "checksum" text NOT NULL,
    "source" text NOT NULL CHECK ("source" IN ('upload', 'artifact')),
    "status" text NOT NULL CHECK ("status" IN ('pending', 'ready', 'failed', 'deleted')),
    "path" text NOT NULL,
    "idempotency_key" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("user_id", "workspace_id", "file_id"),
    FOREIGN KEY ("user_id", "workspace_id") REFERENCES "agent_workspaces"("user_id", "workspace_id") ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX "workspace_files_owner_workspace_idempotency_key_uidx"
    ON "workspace_files" ("user_id", "workspace_id", "idempotency_key")
    WHERE "idempotency_key" IS NOT NULL;
`;

describe("WorkspaceMetadataStore Postgres adapter", () => {
  let client: PGlite;

  beforeEach(async () => {
    client = new PGlite();
    await client.exec(schemaSql);
    await client.query(`INSERT INTO "user" ("id") VALUES ($1), ($2)`, ["user-1", OTHER_USER]);
  });

  afterEach(async () => {
    await client.close();
  });

  const makeStore = () => {
    const database = drizzle({
      client,
      schema: { agentWorkspaces, workspaceFiles },
    });
    return makeWorkspaceMetadataStore(database, { provider: "cloudflare-sandbox" });
  };

  it("isolates workspace and file operations by owner", async () => {
    const store = makeStore();
    const firstScope = scope();
    const secondScope = scope({ userId: OTHER_USER });

    await Effect.runPromise(store.createWorkspace({ ...firstScope, state: "created" }));
    await Effect.runPromise(store.createWorkspace({ ...secondScope, state: "created" }));
    const firstFile = await Effect.runPromise(store.createFile(fileRecord({ state: "pending" })));
    await Effect.runPromise(
      store.createFile(
        fileRecord({
          objectKey: `users/user-2/workspaces/${UUIDS.workspace}/uploads/${UUIDS.file}`,
          userId: OTHER_USER,
        }),
      ),
    );

    await expect(
      Effect.runPromise(store.getFile(secondScope, firstFile.fileId)),
    ).resolves.toMatchObject({ userId: OTHER_USER });
    await expect(
      Effect.runPromise(store.getFile(scope({ userId: "unknown-user" }), firstFile.fileId)),
    ).rejects.toBeInstanceOf(FileRecordNotFoundError);
    await expect(Effect.runPromise(store.listFiles(firstScope))).resolves.toHaveLength(1);
    await expect(Effect.runPromise(store.listWorkspaces(OTHER_USER))).resolves.toStrictEqual([
      expect.objectContaining(secondScope),
    ]);
  });

  it("handles duplicate workspace and file operations deterministically", async () => {
    const store = makeStore();
    const expectedScope = scope();
    await Effect.runPromise(store.createWorkspace({ ...expectedScope, state: "created" }));

    await expect(
      Effect.runPromise(store.createWorkspace({ ...expectedScope, state: "created" })),
    ).rejects.toBeInstanceOf(WorkspaceConflictError);

    const first = await Effect.runPromise(store.createFile(fileRecord({ state: "pending" })));
    const retried = await Effect.runPromise(
      store.createFile(fileRecord({ fileId: UUIDS.otherFile, state: "pending" })),
    );
    expect(retried.fileId).toBe(first.fileId);

    await expect(
      Effect.runPromise(
        store.createFile(fileRecord({ idempotencyKey: "different-operation", state: "pending" })),
      ),
    ).rejects.toBeInstanceOf(WorkspaceConflictError);
    await expect(Effect.runPromise(store.listFiles(expectedScope))).resolves.toHaveLength(1);
  });

  it("applies only valid lifecycle transitions and makes transition retries idempotent", async () => {
    const store = makeStore();
    const expectedScope = scope();
    await Effect.runPromise(store.createWorkspace({ ...expectedScope, state: "created" }));
    await Effect.runPromise(store.createFile(fileRecord({ state: "pending" })));

    await expect(
      Effect.runPromise(store.transitionWorkspace(expectedScope, "stopping")),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
    await Effect.runPromise(store.transitionWorkspace(expectedScope, "starting"));
    await expect(
      Effect.runPromise(store.transitionWorkspace(expectedScope, "starting")),
    ).resolves.toMatchObject({ state: "starting" });
    await expect(
      Effect.runPromise(store.transitionWorkspace(expectedScope, "running")),
    ).resolves.toMatchObject({ state: "running" });

    await Effect.runPromise(store.transitionFile(expectedScope, UUIDS.file, "ready"));
    await expect(
      Effect.runPromise(store.transitionFile(expectedScope, UUIDS.file, "ready")),
    ).resolves.toMatchObject({ state: "ready" });
    await expect(
      Effect.runPromise(store.transitionFile(expectedScope, UUIDS.file, "failed")),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });

  it("deletes files and cascades workspace deletion without crossing owners", async () => {
    const store = makeStore();
    const firstScope = scope();
    const secondScope = scope({ userId: OTHER_USER });
    await Effect.runPromise(store.createWorkspace({ ...firstScope, state: "created" }));
    await Effect.runPromise(store.createWorkspace({ ...secondScope, state: "created" }));
    await Effect.runPromise(store.createFile(fileRecord()));

    await Effect.runPromise(store.deleteFile(firstScope, UUIDS.file));
    await expect(
      Effect.runPromise(store.deleteFile(firstScope, UUIDS.file)),
    ).rejects.toBeInstanceOf(FileRecordNotFoundError);
    await Effect.runPromise(store.createFile(fileRecord({ idempotencyKey: "replacement" })));
    await Effect.runPromise(store.deleteWorkspace(firstScope));

    await expect(Effect.runPromise(store.getWorkspace(firstScope))).rejects.toBeInstanceOf(
      WorkspaceNotFoundError,
    );
    await expect(Effect.runPromise(store.listFiles(firstScope))).resolves.toStrictEqual([]);
    await expect(Effect.runPromise(store.getWorkspace(secondScope))).resolves.toMatchObject(
      secondScope,
    );
  });
});
