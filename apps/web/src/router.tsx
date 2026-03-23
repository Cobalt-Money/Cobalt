import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import Loader from "./components/feedback/loader";

import "./index.css";
import type { RouterAppContext } from "./routes/__root";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createTanStackRouter({
    context: {
      zero: undefined,
    } satisfies RouterAppContext,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultPendingComponent: () => <Loader />,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
