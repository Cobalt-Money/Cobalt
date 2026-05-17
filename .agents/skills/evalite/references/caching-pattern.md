# LLM Caching Pattern for Watch Mode

When using `evalite watch`, cache LLM responses to avoid burning API credits on every file save. This pattern uses the AI SDK's `wrapLanguageModel` with any key-value store.

```ts
import { wrapLanguageModel, type LanguageModel } from "ai";
import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";
import { createHash } from "node:crypto";

// Any storage that implements get/set (unstorage, redis, Map, etc.)
export type CacheStore = {
  get: (key: string) => Promise<string | number | null | object>;
  set: (key: string, value: string | number | null | object) => Promise<void>;
};

const createKey = (params: LanguageModelV2CallOptions) =>
  createHash("sha256").update(JSON.stringify(params)).digest("hex");

export const cacheModel = (model: LanguageModelV2, storage: CacheStore): LanguageModelV2 => {
  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async (opts) => {
        const key = createKey(opts.params);
        const cached = await storage.get(key);

        if (cached && typeof cached === "object") {
          // Fix Date deserialization
          if ((cached as any)?.response?.timestamp) {
            (cached as any).response.timestamp = new Date((cached as any).response.timestamp);
          }
          // Zero out tokens to show they were cached in the UI
          (cached as any).usage.inputTokens = 0;
          (cached as any).usage.outputTokens = 0;
          (cached as any).usage.totalTokens = 0;
          return cached as any;
        }

        const generated = await opts.doGenerate();
        await storage.set(key, JSON.stringify(generated));
        return generated;
      },
    },
  });
};
```

Usage with `unstorage` filesystem driver:
```ts
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

const storage = createStorage({
  driver: (fsDriver as any)({ base: "./llm-cache.local" }),
});

// In your eval:
const result = await generateText({
  model: traceAISDKModel(cacheModel(openai("gpt-4o-mini"), storage)),
  prompt: input,
});
```

Add `llm-cache.local/` to `.gitignore`.
