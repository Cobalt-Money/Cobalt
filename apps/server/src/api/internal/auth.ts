import { auth } from "@cobalt-web/auth";
import { OpenAPIHono } from "@hono/zod-openapi";

const authRouter = new OpenAPIHono();

authRouter.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

export { authRouter };
