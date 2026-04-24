import { render } from "@testing-library/react";

import { TransactionNotes } from "./transaction-notes";

// Tiptap drives ProseMirror, which needs DOM APIs jsdom doesn't implement
// (elementFromPoint, coord math). Interaction paths (type / blur / Cmd+Enter)
// are verified in the browser; this file sticks to smoke coverage.
describe(TransactionNotes, () => {
  it("renders placeholder when notes are null", () => {
    render(
      <TransactionNotes notes={null} onReset={vi.fn()} onUpdate={vi.fn()} />
    );

    const placeholder = document.querySelector(
      '[data-placeholder="Add a note…"]'
    );
    expect(placeholder).toBeTruthy();
  });

  it("renders existing notes content", () => {
    const initial = {
      content: [
        {
          content: [{ text: "existing note", type: "text" }],
          type: "paragraph",
        },
      ],
      type: "doc",
    };

    const { container } = render(
      <TransactionNotes notes={initial} onReset={vi.fn()} onUpdate={vi.fn()} />
    );

    expect(container.textContent).toContain("existing note");
  });
});
