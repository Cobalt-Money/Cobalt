import { render } from "@testing-library/react";

import { TransactionNotes } from "./transaction-notes";

// Milkdown drives ProseMirror, which needs DOM APIs jsdom doesn't implement
// (elementFromPoint, coord math). Crepe also creates async, so the inner
// editor isn't mounted on first render here. Interaction paths are verified
// in the browser; this file sticks to "renders without throwing" smoke.
describe(TransactionNotes, () => {
  it("mounts for empty notes without throwing", () => {
    const { container } = render(
      <TransactionNotes notes={null} onReset={vi.fn()} onUpdate={vi.fn()} />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it("mounts for non-empty markdown without throwing", () => {
    const { container } = render(
      <TransactionNotes
        notes="existing note"
        onReset={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });
});
