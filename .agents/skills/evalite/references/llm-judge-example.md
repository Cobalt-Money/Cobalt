# LLM-as-Judge Scorer Example

A Factuality scorer using OpenAI's GPT-4o and structured output:

```ts
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { createScorer } from "evalite";
import { z } from "zod";

export const Factuality = createScorer<string, string, string>({
  name: "Factuality",
  scorer: async ({ input, expected, output }) => {
    const { object } = await generateObject({
      model: openai("gpt-4o-2024-11-20"),
      prompt: `
        You are comparing a submitted answer to an expert answer on a given question.
        [BEGIN DATA]
        ************
        [Question]: ${input}
        ************
        [Expert]: ${expected}
        ************
        [Submission]: ${output}
        ************
        [END DATA]

        Compare the factual content of the submitted answer with the expert answer.
        Ignore any differences in style, grammar, or punctuation.
        The submitted answer may either be a subset or superset of the expert answer,
        or it may conflict with it. Determine which case applies.
        Answer by selecting one of the following options:
        (A) The submitted answer is a subset of the expert answer and is fully consistent with it.
        (B) The submitted answer is a superset of the expert answer and is fully consistent with it.
        (C) The submitted answer contains all the same details as the expert answer.
        (D) There is a disagreement between the submitted answer and the expert answer.
        (E) The answers differ, but these differences don't matter from the perspective of factuality.
      `,
      schema: z.object({
        answer: z.enum(["A", "B", "C", "D", "E"]).describe("Your selection."),
        rationale: z.string().describe("Why you chose this answer. Be very detailed."),
      }),
    });

    const scores = { A: 0.4, B: 0.6, C: 1, D: 0, E: 1 };

    return {
      score: scores[object.answer],
      metadata: { rationale: object.rationale },
    };
  },
});
```

Usage:
```ts
evalite("Factuality", {
  data: [
    { input: "What is the capital of France?", expected: "Paris" },
  ],
  task: async (input) => {
    return "The capital of France is a city that starts with P and ends in 'aris'.";
  },
  scorers: [Factuality],
});
```

The `metadata.rationale` field will appear in the Evalite UI alongside the score, which is valuable for debugging why a scorer gave a particular score.
