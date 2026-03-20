import type { auth } from "@cobalt-web/auth";

type Session = typeof auth.$Infer.Session;

export interface AppEnv {
  Variables: {
    user: Session["user"];
    session: Session["session"];
  };
}
