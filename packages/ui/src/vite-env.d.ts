/**
 * Minimal Vite ambient declarations for the ui package.
 *
 * The ui package doesn't have a direct `vite` devDependency (it's bundled by
 * consuming apps), so we can't pull in `vite/client` types via `types: [...]`.
 * Declare the bits we use here: `import.meta.glob` and SVG URL imports.
 */

interface ImportMeta {
  readonly url: string;
  glob<T = unknown>(
    pattern: string | readonly string[],
    options?: {
      eager?: boolean;
      query?: string | Record<string, string | number | boolean>;
      import?: string;
    },
  ): Record<string, T>;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.css";
