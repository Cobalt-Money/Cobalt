import { tool } from "ai";
import Parallel from "parallel-web";
import { z } from "zod";

function getClient() {
  const apiKey = process.env.PARALLEL_API_KEY;
  if (!apiKey) {
    throw new Error("PARALLEL_API_KEY is not set");
  }
  return new Parallel({ apiKey });
}

export const webSearchTool = tool({
  description:
    "Search the web for current information, market data, financial news, regulatory updates, or general knowledge. Use when the question requires real-time or external context.",
  execute: ({ query }) => {
    const parallel = getClient();
    return parallel.beta.search({
      betas: ["search-extract-2025-10-10"],
      max_results: 10,
      mode: "agentic",
      objective: query,
    });
  },
  inputSchema: z.object({
    query: z.string().describe("The search query to find information about"),
  }),
});

export const webExtractTool = tool({
  description:
    "Extract and read the full content of specific web pages. Use when a user provides a URL or when you need to read a specific page in detail.",
  execute: ({ urls }) => {
    const parallel = getClient();
    return parallel.beta.extract({
      betas: ["search-extract-2025-10-10"],
      full_content: true,
      urls,
    });
  },
  inputSchema: z.object({
    urls: z.array(z.string().url()).describe("URLs to extract content from"),
  }),
});
