import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const chatRouter = new OpenAPIHono();

chatRouter.use("/*", requireAuth);

// POST   /         → stream AI chat response
// DELETE /         → delete a chat
// GET    /list     → list user's chats
// POST   /list     → create a new chat
// GET    /:chatId  → get chat with messages and votes

export { chatRouter };
