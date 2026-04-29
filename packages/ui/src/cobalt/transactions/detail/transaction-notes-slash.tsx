import {
  CodeSquareIcon,
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
import type { CmdKey, CommandManager, Editor } from "@milkdown/kit/core";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import {
  createCodeBlockCommand,
  insertHrCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import { insertTableCommand } from "@milkdown/kit/preset/gfm";
import { Plugin } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { SlashProvider, slashFactory } from "@milkdown/plugin-slash";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

export interface SlashItem {
  icon: IconSvgElement;
  run: (commands: CommandManager) => void;
  searchTerms: string[];
  title: string;
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    icon: Heading01Icon,
    run: (c) => c.call(wrapInHeadingCommand.key as CmdKey<number>, 1),
    searchTerms: ["h1", "heading", "title"],
    title: "Heading 1",
  },
  {
    icon: Heading02Icon,
    run: (c) => c.call(wrapInHeadingCommand.key as CmdKey<number>, 2),
    searchTerms: ["h2", "heading"],
    title: "Heading 2",
  },
  {
    icon: Heading03Icon,
    run: (c) => c.call(wrapInHeadingCommand.key as CmdKey<number>, 3),
    searchTerms: ["h3", "heading", "subheading"],
    title: "Heading 3",
  },
  {
    icon: LeftToRightListBulletIcon,
    run: (c) => c.call(wrapInBulletListCommand.key),
    searchTerms: ["bullet", "list", "unordered"],
    title: "Bulleted list",
  },
  {
    icon: LeftToRightListNumberIcon,
    run: (c) => c.call(wrapInOrderedListCommand.key),
    searchTerms: ["numbered", "ordered", "list"],
    title: "Numbered list",
  },
  {
    icon: CodeSquareIcon,
    run: (c) => c.call(createCodeBlockCommand.key),
    searchTerms: ["code", "codeblock", "pre"],
    title: "Code block",
  },
  {
    icon: QuoteDownIcon,
    run: (c) => c.call(wrapInBlockquoteCommand.key),
    searchTerms: ["quote", "blockquote"],
    title: "Quote",
  },
  {
    icon: MinusSignIcon,
    run: (c) => c.call(insertHrCommand.key),
    searchTerms: ["hr", "divider", "line"],
    title: "Divider",
  },
  {
    icon: GridTableIcon,
    run: (c) =>
      c.call(insertTableCommand.key as CmdKey<{ row?: number; col?: number }>, {
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

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  ({ items, onSelect }, ref) => {
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
        <div className="z-50 w-60 rounded-md border border-border bg-popover p-2 text-muted-foreground text-sm shadow-md">
          No matches
        </div>
      );
    }

    return (
      <div className="z-50 max-h-80 w-60 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
        {items.map((item, i) => (
          <button
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${
              i === selectedIndex ? "bg-accent" : ""
            }`}
            key={item.title}
            onClick={() => onSelect(item)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            <HugeiconsIcon
              className="shrink-0 text-muted-foreground"
              icon={item.icon}
              size={16}
            />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
    );
  }
);
SlashMenu.displayName = "SlashMenu";

function filterItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) {
    return SLASH_ITEMS;
  }
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.searchTerms.some((term) => term.includes(q))
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
    const root: Root = createRoot(content);

    const providerRef: { current: SlashProvider | null } = { current: null };
    const provider = new SlashProvider({
      content,
      offset: 8,
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
      const commandManager = ctx.get(commandsCtx);
      item.run(commandManager);
      provider.hide();
      v.focus();
    }

    function setRef(r: SlashMenuRef | null) {
      state.menuRef = r;
    }

    function render() {
      const text = provider.getContent(view) ?? "";
      const query = text.startsWith("/") ? text.slice(1) : "";
      root.render(
        <MenuRoot
          items={filterItems(query)}
          onSelect={selectItem}
          setRef={setRef}
        />
      );
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
      })
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
