export function evalsEnabled(): boolean {
  if (process.env.RUN_EVALS === "1") {
    return true;
  }
  return Boolean(process.env.AI_GATEWAY_API_KEY) && process.env.CI !== "true";
}
