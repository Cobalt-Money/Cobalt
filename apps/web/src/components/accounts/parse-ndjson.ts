export function parseNdjson<T>(buffer: string): { events: T[]; rest: string } {
  const events: T[] = [];
  let rest = buffer;
  let newline = rest.indexOf("\n");
  while (newline !== -1) {
    const line = rest.slice(0, newline).trim();
    rest = rest.slice(newline + 1);
    if (line.length > 0) {
      try {
        events.push(JSON.parse(line) as T);
      } catch {
        return { events, rest: `${line}\n${rest}` };
      }
    }
    newline = rest.indexOf("\n");
  }
  return { events, rest };
}
