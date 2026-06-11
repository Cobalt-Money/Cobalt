import { Crepe } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import { replaceAll } from "@milkdown/kit/utils";
import { useCallback, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

import { createSlashBundle } from "./transaction-notes-slash";

const AUTOSAVE_DEBOUNCE_MS = 800;

export interface TransactionNotesProps {
  notes: string | null;
  onReset: () => void;
  onUpdate: (markdown: string) => void;
}

export function TransactionNotes({ notes, onReset, onUpdate }: TransactionNotesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const lifecycleRef = useRef<Promise<void>>(Promise.resolve());
  const lastCommittedRef = useRef<string>(notes ?? "");
  const initialNotesRef = useRef<string>(notes ?? "");

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

  useEffect(() => {
    const div = containerRef.current;
    if (!div) {
      return;
    }
    const state: { crepe: Crepe | null; disposed: boolean } = { crepe: null, disposed: false };

    async function safeDestroy(crepe: Crepe) {
      try {
        await crepe.destroy();
      } catch (error) {
        console.error(error);
      }
    }

    async function mount() {
      if (state.disposed) {
        return;
      }
      const crepe = new Crepe({
        defaultValue: initialNotesRef.current,
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
        root: div,
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
      try {
        await crepe.create();
      } catch (error) {
        console.error(error);
        return;
      }
      if (state.disposed) {
        await safeDestroy(crepe);
        return;
      }
      state.crepe = crepe;
      crepeRef.current = crepe;
    }

    async function unmount() {
      const { crepe } = state;
      if (!crepe) {
        return;
      }
      if (crepeRef.current === crepe) {
        crepeRef.current = null;
      }
      state.crepe = null;
      await safeDestroy(crepe);
    }

    const previous = lifecycleRef.current;
    lifecycleRef.current = (async () => {
      await previous;
      await mount();
    })();

    return () => {
      state.disposed = true;
      const prior = lifecycleRef.current;
      lifecycleRef.current = (async () => {
        await prior;
        await unmount();
      })();
    };
  }, []);

  useEffect(() => {
    const crepe = crepeRef.current;
    const incoming = notes ?? "";
    if (!crepe) {
      initialNotesRef.current = incoming;
      lastCommittedRef.current = incoming;
      return;
    }
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
      <div data-milkdown-root ref={containerRef} />
    </div>
  );
}

export default TransactionNotes;
