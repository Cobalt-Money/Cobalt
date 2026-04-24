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
import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import { Suggestion } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import tippy from "tippy.js";
import type { Instance as TippyInstance } from "tippy.js";

export interface SlashItem {
  command: (ctx: {
    editor: Editor;
    range: { from: number; to: number };
  }) => void;
  icon: IconSvgElement;
  searchTerms: string[];
  title: string;
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run(),
    icon: Heading01Icon,
    searchTerms: ["h1", "heading", "title"],
    title: "Heading 1",
  },
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run(),
    icon: Heading02Icon,
    searchTerms: ["h2", "heading"],
    title: "Heading 2",
  },
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run(),
    icon: Heading03Icon,
    searchTerms: ["h3", "heading", "subheading"],
    title: "Heading 3",
  },
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .clearNodes()
        .toggleBulletList()
        .run(),
    icon: LeftToRightListBulletIcon,
    searchTerms: ["bullet", "list", "unordered"],
    title: "Bulleted list",
  },
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .clearNodes()
        .toggleOrderedList()
        .run(),
    icon: LeftToRightListNumberIcon,
    searchTerms: ["numbered", "ordered", "list"],
    title: "Numbered list",
  },
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .clearNodes()
        .toggleCodeBlock()
        .run(),
    icon: CodeSquareIcon,
    searchTerms: ["code", "codeblock", "pre"],
    title: "Code block",
  },
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .clearNodes()
        .toggleBlockquote()
        .run(),
    icon: QuoteDownIcon,
    searchTerms: ["quote", "blockquote"],
    title: "Quote",
  },
  {
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    icon: MinusSignIcon,
    searchTerms: ["hr", "divider", "line"],
    title: "Divider",
  },
  {
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ cols: 3, rows: 3, withHeaderRow: true })
        .run(),
    icon: GridTableIcon,
    searchTerms: ["table", "grid"],
    title: "Table",
  },
];

export interface SlashMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashMenuProps {
  command: (item: SlashItem) => void;
  items: SlashItem[];
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  ({ command, items }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
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
            command(item);
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
            onClick={() => command(item)}
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

export const SlashExtension = Extension.create({
  addProseMirrorPlugins() {
    return [
      Suggestion({
        allowSpaces: false,
        char: "/",
        command: ({ editor, range, props }) => {
          (props as SlashItem).command({ editor, range });
        },
        editor: this.editor,
        items: ({ query }) => filterItems(query),
        render: () => {
          let renderer: ReactRenderer<SlashMenuRef, SlashMenuProps> | null =
            null;
          let popup: TippyInstance | null = null;

          return {
            onExit: () => {
              popup?.destroy();
              renderer?.destroy();
              popup = null;
              renderer = null;
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.hide();
                return true;
              }
              return renderer?.ref?.onKeyDown(props) ?? false;
            },
            onStart: (props) => {
              renderer = new ReactRenderer(SlashMenu, {
                editor: props.editor,
                props,
              });

              if (!props.clientRect) {
                return;
              }

              popup =
                tippy("body", {
                  appendTo: () => document.body,
                  content: renderer.element,
                  getReferenceClientRect: () =>
                    props.clientRect?.() ?? new DOMRect(),
                  interactive: true,
                  placement: "bottom-start",
                  showOnCreate: true,
                  trigger: "manual",
                })[0] ?? null;
            },
            onUpdate: (props) => {
              renderer?.updateProps(props);
              if (!props.clientRect) {
                return;
              }
              popup?.setProps({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
              });
            },
          };
        },
      }),
    ];
  },
  name: "slashCommands",
});
