import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getUserLimitsMock = vi.fn();
const getChatMock = vi.fn();
const upsertMessageMock = vi.fn<() => Promise<void>>();
const createFinanceAgentMock = vi.fn();
const startMock = vi.fn();

vi.mock(
  import("@cobalt-web/auth"),
  () =>
    ({
      auth: { api: { getSession: getSessionMock } },
    }) as never,
);

vi.mock(
  import("@cobalt-web/server-data/subscriptions"),
  () =>
    ({
      getUserLimits: getUserLimitsMock,
      userHasActiveSubscription: vi.fn().mockResolvedValue(false),
    }) as never,
);

vi.mock(
  import("@cobalt-web/server-data/chat/queries"),
  () =>
    ({
      getChat: getChatMock,
    }) as never,
);

vi.mock(
  import("@cobalt-web/server-data/chat/mutations"),
  () =>
    ({
      upsertMessage: upsertMessageMock,
    }) as never,
);

vi.mock(
  import("../../../ai/agents/finance-agent/finance-agent.js"),
  () =>
    ({
      createFinanceAgent: createFinanceAgentMock,
    }) as never,
);

vi.mock(
  import("workflow/api"),
  () =>
    ({
      start: startMock,
    }) as never,
);

const { chatStreamRouter } = await import("./stream.js");

const HAIKU = "anthropic/claude-haiku-4.5";
const OPUS = "anthropic/claude-opus-4.7";

const sampleMessage = {
  id: "m1",
  parts: [{ text: "hi", type: "text" }],
  role: "user",
};

function postStream(chatId: string, body: unknown) {
  return chatStreamRouter.request(`/${chatId}/stream`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("chat stream — tier gate (SRI-102 / #366)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      session: { id: "sess1" },
      user: { id: "user1" },
    });
    getChatMock.mockResolvedValue({ id: "c1", title: "existing", userId: "user1" });
    upsertMessageMock.mockResolvedValue();
  });

  it("blocks free user with 403 model_not_allowed when requesting Opus", async () => {
    getUserLimitsMock.mockResolvedValue({
      connections: 2,
      extendedThinking: false,
      models: [HAIKU],
    });
    const res = await postStream("c1", {
      effort: "low",
      message: sampleMessage,
      messages: [sampleMessage],
      model: OPUS,
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("model_not_allowed");
    expect(createFinanceAgentMock).not.toHaveBeenCalled();
    expect(upsertMessageMock).not.toHaveBeenCalled();
  });

  it("blocks free user with 403 extended_thinking_not_allowed when reasoning model + effort=high on allowed Haiku", async () => {
    getUserLimitsMock.mockResolvedValue({
      connections: 2,
      extendedThinking: false,
      models: [HAIKU],
    });
    // "+reasoning" suffix tells parseModelWithReasoning to enable reasoning;
    // base model (Haiku) is in the allowed list so the gate hits extended-thinking, not model.
    const res = await postStream("c1", {
      effort: "high",
      message: sampleMessage,
      messages: [sampleMessage],
      model: `${HAIKU}+reasoning`,
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("extended_thinking_not_allowed");
    expect(createFinanceAgentMock).not.toHaveBeenCalled();
  });

  it("returns 401 when no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const res = await postStream("c1", {
      message: sampleMessage,
      messages: [sampleMessage],
      model: HAIKU,
    });
    expect(res.status).toBe(401);
    expect(getUserLimitsMock).not.toHaveBeenCalled();
  });
});
