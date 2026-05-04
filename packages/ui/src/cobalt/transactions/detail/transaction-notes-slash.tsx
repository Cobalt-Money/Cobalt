import { cn } from "@cobalt-web/ui/lib/utils";
import {
  CheckListIcon,
  GridTableIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  MinusSignIcon,
  QuoteDownIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CmdKey, Editor } from "@milkdown/kit/core";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import {
  insertHrCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import { insertTableCommand } from "@milkdown/kit/preset/gfm";
import { Plugin } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { SlashProvider, slashFactory } from "@milkdown/plugin-slash";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

export interface SlashItem {
  group: string;
  icon: IconSvgElement;
  run: (ctx: Ctx) => void;
  searchTerms: string[];
  title: string;
}

function callCmd<T = undefined>(ctx: Ctx, key: CmdKey<T>, payload?: T): void {
  ctx.get(commandsCtx).call(key, payload as T);
}

function insertTaskList(ctx: Ctx): void {
  callCmd(ctx, wrapInBulletListCommand.key);
  const view = ctx.get(editorViewCtx);
  const { state, dispatch } = view;
  const { $from } = state.selection;
  for (let { depth } = $from; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "list_item") {
      const pos = $from.before(depth);
      dispatch(
        state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          checked: false,
        }),
      );
      break;
    }
  }
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    group: "headings",
    icon: Heading01Icon,
    run: (ctx) => callCmd(ctx, wrapInHeadingCommand.key as CmdKey<number>, 1),
    searchTerms: ["h1", "heading", "title"],
    title: "Heading 1",
  },
  {
    group: "headings",
    icon: Heading02Icon,
    run: (ctx) => callCmd(ctx, wrapInHeadingCommand.key as CmdKey<number>, 2),
    searchTerms: ["h2", "heading"],
    title: "Heading 2",
  },
  {
    group: "headings",
    icon: Heading03Icon,
    run: (ctx) => callCmd(ctx, wrapInHeadingCommand.key as CmdKey<number>, 3),
    searchTerms: ["h3", "heading", "subheading"],
    title: "Heading 3",
  },
  {
    group: "lists",
    icon: LeftToRightListBulletIcon,
    run: (ctx) => callCmd(ctx, wrapInBulletListCommand.key),
    searchTerms: ["bullet", "list", "unordered"],
    title: "Bulleted list",
  },
  {
    group: "lists",
    icon: LeftToRightListNumberIcon,
    run: (ctx) => callCmd(ctx, wrapInOrderedListCommand.key),
    searchTerms: ["numbered", "ordered", "list"],
    title: "Numbered list",
  },
  {
    group: "lists",
    icon: CheckListIcon,
    run: insertTaskList,
    searchTerms: ["todo", "task", "checkbox", "check"],
    title: "To-do list",
  },
  {
    group: "blocks",
    icon: QuoteDownIcon,
    run: (ctx) => callCmd(ctx, wrapInBlockquoteCommand.key),
    searchTerms: ["quote", "blockquote"],
    title: "Quote",
  },
  {
    group: "inserts",
    icon: MinusSignIcon,
    run: (ctx) => callCmd(ctx, insertHrCommand.key),
    searchTerms: ["hr", "divider", "line"],
    title: "Divider",
  },
  {
    group: "inserts",
    icon: GridTableIcon,
    run: (ctx) =>
      callCmd(ctx, insertTableCommand.key as CmdKey<{ row?: number; col?: number }>, {
        col: 3,
        row: 3,
      }),
    searchTerms: ["table", "grid"],
    title: "Table",
  },
];

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuProps {
  items: SlashItem[];
  onSelect: (item: SlashItem) => void;
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(({ items, onSelect }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          onSelect(item);
        }
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-60 px-2.5 py-2 text-center text-muted-foreground text-sm">No matches</div>
    );
  }

  return (
    <div className="scrollbar-thin max-h-96 w-64 overflow-y-auto">
      {items.map((item, i) => (
        <div key={item.title}>
          {i > 0 && items[i - 1]?.group !== item.group ? (
            <div className="my-1 h-px bg-border" />
          ) : null}
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
              i === selectedIndex && "bg-input/30 font-medium",
            )}
            onClick={() => onSelect(item)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <HugeiconsIcon
                className="text-muted-foreground"
                icon={item.icon}
                size={18}
                strokeWidth={2}
              />
            </span>
            <span>{item.title}</span>
          </button>
        </div>
      ))}
    </div>
  );
});
SlashMenu.displayName = "SlashMenu";

function filterItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) {
    return SLASH_ITEMS;
  }
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.searchTerms.some((term) => term.includes(q)),
  );
}

interface SharedSlashState {
  hide: () => void;
  menuRef: SlashMenuRef | null;
  visible: boolean;
}

function MenuRoot({
  items,
  onSelect,
  setRef,
}: SlashMenuProps & { setRef: (r: SlashMenuRef | null) => void }) {
  return <SlashMenu items={items} onSelect={onSelect} ref={setRef} />;
}

function buildSlashView(ctx: Ctx, state: SharedSlashState) {
  return (view: EditorView) => {
    const content = document.createElement("div");
    content.dataset.transactionNotesSlash = "";
    content.dataset.show = "false";
    content.className =
      "absolute z-50 rounded-2xl bg-[oklch(0.949_0_0)] p-1 shadow-2xl ring-1 ring-foreground/5 dark:bg-[oklch(0.29_0_0)]";
    const root: Root = createRoot(content);

    const providerRef: { current: SlashProvider | null } = { current: null };
    const provider = new SlashProvider({
      content,
      offset: 8,
      root: document.body,
      shouldShow: (v) => {
        const text = providerRef.current?.getContent(v);
        return text?.startsWith("/") ?? false;
      },
    });
    providerRef.current = provider;
    provider.onShow = () => {
      state.visible = true;
    };
    provider.onHide = () => {
      state.visible = false;
      state.menuRef = null;
    };
    state.hide = () => provider.hide();

    function selectItem(item: SlashItem) {
      const v = ctx.get(editorViewCtx);
      const { state: editorState, dispatch } = v;
      const { from } = editorState.selection;
      const text = provider.getContent(v) ?? "";
      const slashIdx = text.lastIndexOf("/");
      if (slashIdx !== -1) {
        const triggerLen = text.length - slashIdx;
        dispatch(editorState.tr.delete(from - triggerLen, from));
      }
      provider.hide();
      v.focus();
      item.run(ctx);
    }

    function setRef(r: SlashMenuRef | null) {
      state.menuRef = r;
    }

    function render() {
      const text = provider.getContent(view) ?? "";
      const query = text.startsWith("/") ? text.slice(1) : "";
      root.render(<MenuRoot items={filterItems(query)} onSelect={selectItem} setRef={setRef} />);
    }

    render();

    return {
      destroy: () => {
        provider.destroy();
        root.unmount();
        content.remove();
        state.visible = false;
        state.menuRef = null;
      },
      update: (v: EditorView, prev?: Parameters<typeof provider.update>[1]) => {
        provider.update(v, prev);
        render();
      },
    };
  };
}

export interface SlashBundle {
  apply: (editor: Editor) => void;
}

export function createSlashBundle(): SlashBundle {
  const slash = slashFactory("transaction-notes-slash");
  const state: SharedSlashState = {
    hide: () => {
      // overwritten by view init
    },
    menuRef: null,
    visible: false,
  };

  const slashKeyProse = $prose(
    () =>
      new Plugin({
        props: {
          decorations: (editorState) => {
            if (!state.visible) {
              return null;
            }
            const { from, $from } = editorState.selection;
            const paragraphStart = $from.start();
            const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
            const slashIdx = textBefore.lastIndexOf("/");
            if (slashIdx === -1) {
              return null;
            }
            const start = paragraphStart + slashIdx;
            const decorations: Decoration[] = [
              Decoration.inline(start, from, {
                class: "rounded-md bg-input/40 px-2 py-1 text-muted-foreground",
              }),
            ];
            if (start + 1 === from) {
              decorations.push(
                Decoration.widget(
                  from,
                  () => {
                    const span = document.createElement("span");
                    span.className =
                      "pointer-events-none rounded-md bg-input/40 pr-1 text-muted-foreground";
                    span.textContent = "Type to search";
                    return span;
                  },
                  { side: 1 },
                ),
              );
            }
            return DecorationSet.create(editorState.doc, decorations);
          },
          handleKeyDown: (_view, event) => {
            if (!state.visible) {
              return false;
            }
            if (event.key === "Escape") {
              state.hide();
              return true;
            }
            if (state.menuRef?.onKeyDown(event)) {
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
      }),
  );

  return {
    apply: (editor) => {
      editor.use(slash).use(slashKeyProse);
      editor.config((ctx: Ctx) => {
        ctx.set(slash.key, { view: buildSlashView(ctx, state) });
      });
    },
  };
}
