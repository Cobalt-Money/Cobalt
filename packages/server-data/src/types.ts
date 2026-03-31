import type { auth } from "@cobalt-web/auth";

type Session = typeof auth.$Infer.Session;
interface ZeroContext {
  userId: string;
}

export interface AppEnv {
  Variables: {
    user: Session["user"];
    session: Session["session"];
    zeroContext: ZeroContext;
  };
}
