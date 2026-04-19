import { tool } from "ai";
import type { UIToolInvocation } from "ai";
import { all, create } from "mathjs";
import { z } from "zod";

export const mathComputationTool = tool({
  description:
    "Evaluate mathematical expressions using Math.js. Use this for arithmetic, statistical calculations, financial formulas, and data analysis. Provide a mathematical expression as a string.",
  execute: ({ expression, variables = {}, description }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const math = create(all!);
      const result = math.evaluate(expression, variables);

      let formattedResult: string | number = result;
      if (typeof result === "number") {
        formattedResult = Math.round(result * 1_000_000) / 1_000_000;
      } else if (Array.isArray(result)) {
        formattedResult = `[${result.join(", ")}]`;
      } else if (typeof result === "object" && result !== null) {
        formattedResult = JSON.stringify(result);
      }

      let expressionLatex = expression;
      try {
        const parsedNode = math.parse(expression);
        expressionLatex = parsedNode.toTex();
      } catch {
        // fall back to raw expression
      }

      return {
        description,
        executedAt: new Date().toISOString(),
        expression,
        expressionLatex,
        formula: `${expression} = ${formattedResult}`,
        operation: "mathematical_evaluation",
        result: formattedResult,
        variables,
      };
    } catch (error) {
      throw new Error(
        `Mathematical computation failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  },
  inputSchema: z.object({
    description: z
      .string()
      .describe("Brief description of what the computation does"),
    expression: z
      .string()
      .describe(
        "Mathematical expression to evaluate (e.g., '2 + 3 * 4', 'sqrt(16)', 'sum([1,2,3,4,5])')"
      ),
    variables: z
      .record(z.string(), z.number())
      .optional()
      .describe(
        "Optional variables to use in the expression (e.g., {x: 5, y: 10})"
      ),
  }),
});

export type MathComputationToolInvocation = UIToolInvocation<
  typeof mathComputationTool
>;
