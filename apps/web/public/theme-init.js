/* Sync with ThemeProvider: storageKey "theme", attribute "class". Runs before paint. */
(function themeInit() {
  try {
    const html = document.documentElement;
    const stored = localStorage.getItem("theme");
    let resolved;
    if (stored === "dark" || stored === "light") {
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
