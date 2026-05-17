# Complete Evalite Example

A fully-fleshed example testing an AI-powered capital city Q&A system with tracing, caching, streaming, and multiple scorers.

## Eval file

```ts
// capitals.eval.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Factuality, Levenshtein } from "autoevals";
import { evalite } from "evalite";
import { traceAISDKModel } from "evalite/ai-sdk";

evalite("Test Capitals", {
  data: async () => [
    { input: "What's the capital of France?", expected: "Paris" },
    { input: "What's the capital of Germany?", expected: "Berlin" },
    { input: "What's the capital of Italy?", expected: "Rome" },
    { input: "What's the capital of Japan?", expected: "Tokyo" },
    { input: "What's the capital of Antarctica?", expected: "Antarctica has no capital" },
    { input: "What's the capital of Bonkersville?", expected: "Unknown" },
  ],
  task: async (input) => {
    const result = await streamText({
      model: traceAISDKModel(openai("gpt-4o-mini")),
      system: `
        Answer the question concisely. Answer in as few words as possible.
        Remove full stops from the end of the output.
        If the country has no capital, return '<country> has no capital'.
        If the country does not exist, return 'Unknown'.
      `,
      prompt: input,
    });
    return result.textStream;
  },
  scorers: [Factuality, Levenshtein],
});
```

## Content generation with custom inline scorers

```ts
// content.eval.ts
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { evalite } from "evalite";
import { traceAISDKModel } from "evalite/ai-sdk";

evalite("Content generation", {
  data: async () => [
    { input: "Write a tweet about TypeScript template literal types." },
    { input: "Write a tweet about TypeScript utility types." },
  ],
  task: async (input) => {
    const result = await generateText({
      model: traceAISDKModel(openai("gpt-4o-mini")),
      prompt: input,
      system: `You are a social media assistant. Return only the tweet. Do not use emojis. Never use hashtags.`,
    });
    return result.text;
  },
  scorers: [
    {
      name: "No Hashtags",
      scorer: ({ output }) => (output.includes("#") ? 0 : 1),
    },
    {
      name: "No Exclamation Marks",
      description: "Ensures the output contains no exclamation marks.",
      scorer: ({ output }) => {
        const outsideCode = output.replace(/```[\s\S]*?```/g, "");
        return outsideCode.includes("!") ? 0 : 1;
      },
    },
  ],
});
```

## Testing conversations (typed messages)

```ts
import { openai } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { Levenshtein } from "autoevals";
import { evalite } from "evalite";
import { traceAISDKModel } from "evalite/ai-sdk";

evalite<CoreMessage[], string, string>("Test Conversations", {
  data: async () => [
    {
      input: [{ content: "What's the capital of France?", role: "user" }],
      expected: "Paris",
    },
  ],
  task: async (input) => {
    const result = streamText({
      model: traceAISDKModel(openai("gpt-4o-mini")),
      system: "Answer concisely.",
      messages: input,
    });
    return await result.text;
  },
  scorers: [Levenshtein],
});
```

## Config file

```ts
// evalite.config.ts
import { defineConfig } from "evalite/config";

export default defineConfig({
  setupFiles: ["dotenv/config"],
  testTimeout: 60_000,
  maxConcurrency: 10,
});
```

## CI workflow

```yaml
name: Run Evals
on: [push, pull_request]
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: "22" }
      - run: npm install
      - name: Run evaluations
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npx evalite --threshold=70
      - name: Export UI
        run: npx evalite export --output=./ui-export
      - uses: actions/upload-artifact@v3
        with: { name: evalite-ui, path: ui-export }
```
