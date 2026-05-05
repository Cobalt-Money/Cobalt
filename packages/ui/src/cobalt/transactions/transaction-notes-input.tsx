import { Crepe } from "@milkdown/crepe";
import { replaceAll } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { forwardRef, useImperativeHandle, useRef } from "react";

import { createSlashBundle } from "./detail/transaction-notes-slash";

export interface TransactionNotesInputHandle {
  getMarkdown: () => string;
  reset: (next?: string) => void;
}

export interface TransactionNotesInputProps {
  defaultValue?: string;
  maxLength?: number;
  placeholder?: string;
}

const TransactionNotesInputEditor = forwardRef<
  TransactionNotesInputHandle,
  TransactionNotesInputProps
>(({ defaultValue = "", maxLength, placeholder = "Add a note…" }, ref) => {
  const crepeRef = useRef<Crepe | null>(null);
  const lastAcceptedRef = useRef<string>(defaultValue);
  const maxLengthRef = useRef(maxLength);
  maxLengthRef.current = maxLength;

  useEditor((root) => {
    const crepe = new Crepe({
      defaultValue,
      featureConfigs: {
        [Crepe.Feature.Placeholder]: { mode: "block", text: placeholder },
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
        const cap = maxLengthRef.current;
        if (cap !== undefined && markdown.length > cap) {
          crepe.editor.action(replaceAll(lastAcceptedRef.current));
          return;
        }
        lastAcceptedRef.current = markdown;
      });
    });
    crepeRef.current = crepe;
    return crepe;
  }, []);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return crepeRef.current?.getMarkdown() ?? lastAcceptedRef.current;
    },
    reset(next = "") {
      lastAcceptedRef.current = next;
      crepeRef.current?.editor.action(replaceAll(next));
    },
  }));

  return (
    <div className="w-full min-w-0">
      <Milkdown />
    </div>
  );
});
TransactionNotesInputEditor.displayName = "TransactionNotesInputEditor";

export const TransactionNotesInput = forwardRef<
  TransactionNotesInputHandle,
  TransactionNotesInputProps
>((props, ref) => (
  <MilkdownProvider>
    <TransactionNotesInputEditor ref={ref} {...props} />
  </MilkdownProvider>
));
TransactionNotesInput.displayName = "TransactionNotesInput";

export default TransactionNotesInput;
