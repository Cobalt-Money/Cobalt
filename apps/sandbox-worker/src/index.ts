/**
 * Cobalt sandbox CF Worker.
 *
 * Pure runtime — re-exports the TanStack code-mode worker handler. The Vercel
 * server holds all bindings (and the user's `userId` in closure); this Worker
 * receives only the LLM-generated code and the tool *schemas*. When the code
 * calls a tool, the Worker returns a tool-call request; the driver on Vercel
 * runs the binding locally with the closed-over `userId`, then POSTs the
 * result back. The Worker has no callback URL, no DB credentials, no env
 * access — its only capability is loading the LLM-generated code into a
 * fresh Worker isolate via the `worker_loader` (Dynamic Workers) binding
 * (SRI-312 patch; replaces gated `unsafe_eval`).
 */
export { default } from "@tanstack/ai-isolate-cloudflare/worker";
