import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import "@cobalt-web/ui/globals.css";

// Dev-only react-grab overlay — ported from prior main.tsx; mirrors
// apps/web/src/routes/__root.tsx.
if (import.meta.env.DEV) {
  void import("react-grab");
}

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
