/* Sync with ThemeProvider: storageKey "theme", attribute "class". Runs before paint. */
(function themeInit() {
  try {
    const html = document.documentElement;
    const FORCED_LIGHT_PATHS = ["/"];
    const FORCED_DARK_PATHS = ["/login"];
    const path = window.location.pathname;
    const forcedLight = FORCED_LIGHT_PATHS.includes(path);
    const forcedDark = FORCED_DARK_PATHS.includes(path);
    const stored = localStorage.getItem("theme");
    let resolved;
    if (forcedLight) {
      resolved = "light";
    } else if (forcedDark) {
      resolved = "dark";
    } else if (stored === "dark" || stored === "light") {
      resolved = stored;
    } else if (stored === "system" || !stored) {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = "light";
    }
    html.classList.remove("light", "dark");
    if (resolved === "dark") {
      html.classList.add("dark");
    }
  } catch {
    /* ignore */
  }
})();
