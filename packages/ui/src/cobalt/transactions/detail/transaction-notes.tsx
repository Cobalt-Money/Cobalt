import { Crepe } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import { replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { useCallback, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

import { createSlashBundle } from "./transaction-notes-slash";

const AUTOSAVE_DEBOUNCE_MS = 800;

export interface TransactionNotesProps {
  notes: string | null;
  onReset: () => void;
  onUpdate: (markdown: string) => void;
}

function TransactionNotesEditor({ notes, onReset, onUpdate }: TransactionNotesProps) {
  const crepeRef = useRef<Crepe | null>(null);
  const lastCommittedRef = useRef<string>(notes ?? "");

  const commit = useCallback(
    (md: string) => {
      const trimmed = md.trim();
      const empty = trimmed === "";
      const next = empty ? "" : md;
      if (next === lastCommittedRef.current) {
        return;
      }
      lastCommittedRef.current = next;
      if (empty) {
        onReset();
      } else {
        onUpdate(md);
      }
    },
    [onReset, onUpdate],
  );

  const debouncedCommit = useDebouncedCallback(commit, AUTOSAVE_DEBOUNCE_MS);

  const commitRef = useRef(commit);
  commitRef.current = commit;
  const debouncedCommitRef = useRef(debouncedCommit);
  debouncedCommitRef.current = debouncedCommit;

  useEditor((root) => {
    const crepe = new Crepe({
      defaultValue: notes ?? "",
      featureConfigs: {
        [Crepe.Feature.Placeholder]: { mode: "block", text: "Add a note…" },
      },
      features: {
        [Crepe.Feature.BlockEdit]: false,
        [Crepe.Feature.CodeMirror]: false,
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.LinkTooltip]: false,
        [Crepe.Feature.Toolbar]: false,
      },
      root,
    });
    createSlashBundle().apply(crepe.editor);
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        debouncedCommitRef.current(markdown);
      });
      listener.blur(() => {
        debouncedCommitRef.current.cancel();
        commitRef.current(crepe.getMarkdown());
      });
    });
    crepeRef.current = crepe;
    return crepe;
  }, []);

  useEffect(() => {
    const crepe = crepeRef.current;
    if (!crepe) {
      return;
    }
    const incoming = notes ?? "";
    if (incoming === lastCommittedRef.current) {
      return;
    }
    const current = crepe.getMarkdown();
    if (current === incoming) {
      lastCommittedRef.current = incoming;
      return;
    }
    crepe.editor.action(replaceAll(incoming));
    lastCommittedRef.current = incoming;
  }, [notes]);

  useEffect(
    () => () => {
      debouncedCommit.flush();
    },
    [debouncedCommit],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      const crepe = crepeRef.current;
      if (!crepe) {
        return;
      }
      debouncedCommit.cancel();
      commit(crepe.getMarkdown());
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        (view.dom as HTMLElement).blur();
      });
    }
  }

  return (
    <div className="w-full min-w-0" onKeyDown={handleKeyDown} role="presentation">
      <Milkdown />
    </div>
  );
}

export function TransactionNotes(props: TransactionNotesProps) {
  return (
    <MilkdownProvider>
      <TransactionNotesEditor {...props} />
    </MilkdownProvider>
  );
}

export default TransactionNotes;
