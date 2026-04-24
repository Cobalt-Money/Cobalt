import type { TiptapDoc } from "@cobalt-web/server-data/transactions/schemas";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

import { SlashExtension } from "./transaction-notes-slash";

const AUTOSAVE_DEBOUNCE_MS = 800;

function stableStringify(doc: TiptapDoc | null): string {
  return doc === null ? "" : JSON.stringify(doc);
}

export interface TransactionNotesProps {
  notes: TiptapDoc | null;
  onReset: () => void;
  onUpdate: (doc: TiptapDoc) => void;
}

export function TransactionNotes({
  notes,
  onReset,
  onUpdate,
}: TransactionNotesProps) {
  const lastCommittedRef = useRef<string>(stableStringify(notes));

  const commit = useCallback(
    (nextDoc: TiptapDoc | null, empty: boolean) => {
      const nextKey = stableStringify(empty ? null : nextDoc);
      if (nextKey === lastCommittedRef.current) {
        return;
      }
      lastCommittedRef.current = nextKey;
      if (empty || nextDoc === null) {
        onReset();
      } else {
        onUpdate(nextDoc);
      }
    },
    [onReset, onUpdate]
  );

  const debouncedCommit = useDebouncedCallback(commit, AUTOSAVE_DEBOUNCE_MS);

  const editor = useEditor({
    content: notes ?? undefined,
    editorProps: {
      attributes: {
        "aria-label": "Transaction notes",
        "aria-multiline": "true",
        class: "min-h-[3rem] outline-none focus:outline-none",
        role: "textbox",
      },
    },
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Add a note…",
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
      SlashExtension,
    ],
    immediatelyRender: false,
    onBlur: ({ editor: e }) => {
      debouncedCommit.cancel();
      commit(e.isEmpty ? null : (e.getJSON() as TiptapDoc), e.isEmpty);
    },
    onUpdate: ({ editor: e }) => {
      debouncedCommit(e.isEmpty ? null : (e.getJSON() as TiptapDoc), e.isEmpty);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = editor.getJSON() as TiptapDoc;
    const incoming = notes ?? { content: [{ type: "paragraph" }], type: "doc" };
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
      lastCommittedRef.current = stableStringify(notes);
    }
  }, [editor, notes]);

  useEffect(
    () => () => {
      debouncedCommit.flush();
    },
    [debouncedCommit]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!editor) {
        return;
      }
      debouncedCommit.cancel();
      commit(
        editor.isEmpty ? null : (editor.getJSON() as TiptapDoc),
        editor.isEmpty
      );
      editor.commands.blur();
    }
  }

  return (
    <div
      className="w-full min-w-0"
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <EditorContent editor={editor} />
    </div>
  );
}

export default TransactionNotes;
