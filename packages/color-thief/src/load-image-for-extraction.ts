/**
 * Load a remote (or data:) image for pixel sampling. Uses `crossOrigin = "anonymous"`
 * so canvas readback is allowed when the response includes CORS headers.
 */
export function loadImageForExtraction(
  url: string,
  init?: { signal?: AbortSignal },
): Promise<HTMLImageElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadImageForExtraction is browser-only"));
  }

  const { signal } = init ?? {};

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  // Image load has no native Promise API.
  /* eslint-disable promise/avoid-new */
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const onAbort = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      img.src = "";
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    const onLoad = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve(img);
    };
    const onError = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Image failed to load"));
    };

    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });

    img.src = url;
  });
  /* eslint-enable promise/avoid-new */
}
