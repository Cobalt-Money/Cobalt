import { CommandEmpty, CommandGroup, CommandItem } from "@cobalt-web/ui/components/command";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  BellDotIcon,
  AppStoreIcon,
  CommandIcon,
  CreditCardIcon,
  Download02Icon,
  Edit02Icon,
  EyeIcon,
  File02Icon,
  Folder01Icon,
  GithubIcon,
  Home04Icon,
  Key01Icon,
  LinkSquare02Icon,
  Logout01Icon,
  Moon02Icon,
  Search02Icon,
  SearchDollarIcon,
  Settings01Icon,
  Sun01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

import { useOpenImportWizard } from "@/components/imports/import-wizard";
import { importsApi } from "@/lib/clients/api-client";
import { logout } from "@/lib/zero-logout";

type SettingsLinkSection = "profile" | "billing" | "api-keys";

type NavPath =
  | "/accounts"
  | "/ai-chat"
  | "/brokerage"
  | "/home"
  | "/research"
  | "/subscriptions"
  | "/transactions";

const COMMAND_NAV_ROUTES: readonly {
  icon: typeof Home04Icon;
  keywords?: string[];
  label: string;
  path: NavPath;
}[] = [
  { icon: Home04Icon, label: "Home", path: "/home" },
  {
    icon: ArrowReloadHorizontalIcon,
    keywords: ["tx", "history"],
    label: "Transactions",
    path: "/transactions",
  },
  {
    icon: AppleStocksIcon,
    keywords: ["invest", "trading"],
    label: "Brokerage",
    path: "/brokerage",
  },
  {
    icon: CreditCardIcon,
    keywords: ["bank"],
    label: "Accounts",
    path: "/accounts",
  },
  {
    icon: SearchDollarIcon,
    keywords: ["books", "notes"],
    label: "Research",
    path: "/research",
  },
  {
    icon: Settings01Icon,
    keywords: ["billing", "plan", "subscription"],
    label: "Subscriptions",
    path: "/subscriptions",
  },
  {
    icon: BellDotIcon,
    keywords: ["chat", "ai", "assistant"],
    label: "AI Chat",
    path: "/ai-chat",
  },
];

interface CommandAction {
  icon: typeof Home04Icon;
  keywords?: string[];
  label: string;
  handleSelect: () => void;
}

function renderCommandItem(action: CommandAction) {
  return (
    <CommandItem
      key={action.label}
      keywords={action.keywords}
      onSelect={action.handleSelect}
      value={action.label}
    >
      <HugeiconsIcon
        aria-hidden
        className="text-muted-foreground"
        icon={action.icon}
        strokeWidth={2}
      />
      {action.label}
    </CommandItem>
  );
}

const RESUMABLE_STEP_LABEL: Record<string, string> = {
  account_mapped: "Map categories",
  category_mapped: "Review & commit",
  column_mapped: "Map accounts",
  committing: "Importing…",
  uploaded: "Map columns",
};

interface NavCallbacks {
  addAccount: () => void;
  searchTransactions: () => void;
  searchChats: () => void;
  searchTickers: () => void;
  addTransaction: () => void;
  addPosition: () => void;
  sellPosition: () => void;
  addTag: () => void;
  manageTags: () => void;
  settings: (section: SettingsLinkSection) => void;
}

interface Props {
  /** Palette open state — gates the resumable-imports query. */
  open: boolean;
  /** Close the palette. */
  onClose: () => void;
  /** Sub-page navigation callbacks owned by parent. */
  nav: NavCallbacks;
}

export function DefaultViewPage({ open, onClose, nav }: Props) {
  const navigate = useNavigate();
  const router = useRouter();
  const openImportWizard = useOpenImportWizard();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const themeToggleIcon = resolvedTheme === "dark" ? Sun01Icon : Moon02Icon;
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const go = useCallback(
    (to: NavPath) => {
      router.preloadRoute({ to });
      onClose();
      navigate({ to });
    },
    [navigate, onClose, router],
  );

  const handleLogout = useCallback(async () => {
    onClose();
    await logout();
    await router.navigate({ to: "/" });
  }, [onClose, router]);

  const resumableImports = useQuery<{
    jobs: {
      id: string;
      originalFilename: string;
      status: "uploaded" | "column_mapped" | "account_mapped" | "category_mapped" | "committing";
    }[];
  }>({
    enabled: open,
    queryFn: async () => {
      const res = await importsApi.list.$get();
      if (!res.ok) {
        throw new Error("Failed to load imports");
      }
      return (await res.json()) as {
        jobs: {
          id: string;
          originalFilename: string;
          status:
            | "uploaded"
            | "column_mapped"
            | "account_mapped"
            | "category_mapped"
            | "committing";
        }[];
      };
    },
    queryKey: ["resumable-imports"],
  });

  const accountActions: CommandAction[] = [
    {
      handleSelect: nav.addAccount,
      icon: Edit02Icon,
      keywords: ["create", "new", "connect", "link", "bank", "brokerage"],
      label: "Add Account",
    },
    {
      handleSelect: () => go("/accounts"),
      icon: EyeIcon,
      keywords: ["view", "details", "balance", "info"],
      label: "View Account Details",
    },
  ];

  const transactionActions: CommandAction[] = [
    {
      handleSelect: nav.searchTransactions,
      icon: Search02Icon,
      keywords: ["find", "query", "search", "filter"],
      label: "Search Transactions",
    },
    {
      handleSelect: nav.addTransaction,
      icon: Edit02Icon,
      keywords: ["create", "new", "add", "manual"],
      label: "Add Manual Transaction",
    },
    {
      handleSelect: nav.addPosition,
      icon: AppleStocksIcon,
      keywords: ["buy", "holding", "stock", "ticker", "brokerage", "share", "manual"],
      label: "Add Manual Position",
    },
    {
      handleSelect: nav.sellPosition,
      icon: AppleStocksIcon,
      keywords: ["sell", "close", "exit", "holding", "share", "stock", "manual"],
      label: "Sell Manual Position",
    },
    {
      handleSelect: () => {
        onClose();
        openImportWizard();
      },
      icon: File02Icon,
      keywords: ["import", "csv", "upload", "mint", "ynab", "monarch", "bulk"],
      label: "Import Transactions",
    },
    ...(resumableImports.data?.jobs ?? []).map<CommandAction>((j) => ({
      handleSelect: () => {
        onClose();
        openImportWizard(j.id);
      },
      icon: File02Icon,
      keywords: ["import", "resume", j.originalFilename],
      label: `Resume: ${j.originalFilename} (${RESUMABLE_STEP_LABEL[j.status] ?? j.status})`,
    })),
    {
      handleSelect: nav.addTag,
      icon: Edit02Icon,
      keywords: ["tag", "label", "category", "create"],
      label: "Add Tag",
    },
    {
      handleSelect: nav.manageTags,
      icon: Tag01Icon,
      keywords: ["tag", "label", "edit", "rename", "delete", "manage"],
      label: "Manage Tags",
    },
    {
      handleSelect: () => {
        onClose();
        void navigate({ to: "/transactions/categories" });
      },
      icon: Folder01Icon,
      keywords: ["category", "categories", "group", "edit", "rename", "delete", "manage"],
      label: "Manage Categories",
    },
    {
      handleSelect: () => go("/transactions"),
      icon: Download02Icon,
      keywords: ["export", "download", "csv", "file"],
      label: "Export Transactions",
    },
  ];

  const brokerageActions: CommandAction[] = [
    {
      handleSelect: nav.searchTickers,
      icon: Search02Icon,
      keywords: ["find", "stock", "equity", "ticker", "symbol", "research"],
      label: "Search Tickers",
    },
    {
      handleSelect: () => go("/brokerage"),
      icon: AppleStocksIcon,
      keywords: ["search", "stocks", "funds", "holdings"],
      label: "Search Holdings",
    },
  ];

  const aiChatActions: CommandAction[] = [
    {
      handleSelect: nav.searchChats,
      icon: Search02Icon,
      keywords: ["find", "query", "search", "chat", "conversation", "ai"],
      label: "Search Chats",
    },
    {
      handleSelect: () => go("/ai-chat"),
      icon: Edit02Icon,
      keywords: ["create", "new", "chat", "conversation", "ai"],
      label: "New Chat",
    },
  ];

  const developerActions: CommandAction[] = [
    {
      handleSelect: () => {
        onClose();
        window.open("https://docs.cobaltpf.com", "_blank", "noopener,noreferrer");
      },
      icon: File02Icon,
      keywords: ["docs", "documentation", "guide", "reference", "help", "developer", "sdk", "api"],
      label: "Docs",
    },
    {
      handleSelect: () => {
        onClose();
        window.open("https://docs.cobaltpf.com/docs/mcp", "_blank", "noopener,noreferrer");
      },
      icon: LinkSquare02Icon,
      keywords: [
        "mcp",
        "model context protocol",
        "claude",
        "chatgpt",
        "openai",
        "gpt",
        "cursor",
        "codex",
        "gemini",
        "ai",
        "agent",
        "docs",
        "connect",
        "integration",
      ],
      label: "MCP Server",
    },
    {
      handleSelect: () => nav.settings("api-keys"),
      icon: Key01Icon,
      keywords: ["api", "api key", "api keys", "developer", "sdk", "token", "bearer", "ck_live"],
      label: "API keys",
    },
    {
      handleSelect: () => {
        onClose();
        window.open(
          "https://www.raycast.com/sriket_komali/cobalt-finance",
          "_blank",
          "noopener,noreferrer",
        );
      },
      icon: CommandIcon,
      keywords: [
        "raycast",
        "extension",
        "launcher",
        "spotlight",
        "mac",
        "macos",
        "quick",
        "shortcut",
      ],
      label: "Raycast Extension",
    },
    {
      handleSelect: () => {
        onClose();
        window.open("https://apps.apple.com/app/id6757945133", "_blank", "noopener,noreferrer");
      },
      icon: AppStoreIcon,
      keywords: ["mobile", "app", "ios", "iphone", "ipad", "app store", "download", "apple"],
      label: "Mobile App",
    },
    {
      handleSelect: () => {
        onClose();
        window.open("https://github.com/Cobalt-Money/Cobalt", "_blank", "noopener,noreferrer");
      },
      icon: GithubIcon,
      keywords: [
        "github",
        "source",
        "code",
        "repo",
        "repository",
        "open source",
        "oss",
        "contribute",
      ],
      label: "GitHub Repository",
    },
  ];

  const settingActions: CommandAction[] = [
    {
      handleSelect: () => nav.settings("profile"),
      icon: Settings01Icon,
      keywords: ["settings", "preferences", "account", "profile"],
      label: "Settings",
    },
    {
      handleSelect: () => nav.settings("billing"),
      icon: CreditCardIcon,
      keywords: ["billing", "subscription", "plan", "payment"],
      label: "Billing",
    },
    {
      handleSelect: () => {
        onClose();
        void navigate({ to: "/privacy" });
      },
      icon: File02Icon,
      keywords: ["privacy", "policy", "data", "gdpr", "legal"],
      label: "Privacy Policy",
    },
    {
      handleSelect: () => {
        onClose();
        void navigate({ to: "/terms" });
      },
      icon: File02Icon,
      keywords: ["terms", "tos", "service", "conditions", "legal", "agreement"],
      label: "Terms of Service",
    },
    {
      handleSelect: () => {
        void handleLogout();
      },
      icon: Logout01Icon,
      keywords: ["logout", "log out", "sign out", "signout", "exit"],
      label: "Log out",
    },
  ];

  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>

      <CommandGroup heading="Navigation">
        {COMMAND_NAV_ROUTES.map(({ icon, keywords, label, path }) => (
          <CommandItem
            key={String(path)}
            keywords={keywords}
            onSelect={() => go(path)}
            value={`${label} ${path}`}
          >
            <HugeiconsIcon
              aria-hidden
              className="text-muted-foreground"
              icon={icon}
              strokeWidth={2}
            />
            {label}
          </CommandItem>
        ))}
      </CommandGroup>

      <CommandGroup heading="Developer">{developerActions.map(renderCommandItem)}</CommandGroup>

      <CommandGroup heading="Accounts">{accountActions.map(renderCommandItem)}</CommandGroup>

      <CommandGroup heading="Transactions">
        {transactionActions.map(renderCommandItem)}
      </CommandGroup>

      <CommandGroup heading="AI Chat">{aiChatActions.map(renderCommandItem)}</CommandGroup>

      <CommandGroup heading="Brokerage">{brokerageActions.map(renderCommandItem)}</CommandGroup>

      <CommandGroup heading="Settings">
        {settingActions.map(renderCommandItem)}
        {themeReady ? (
          <CommandItem
            keywords={[
              "appearance",
              "color",
              "dark",
              "dark mode",
              "light",
              "light mode",
              "mode",
              "theme",
              "toggle",
            ]}
            onSelect={toggleTheme}
            value="theme-toggle"
          >
            <HugeiconsIcon
              aria-hidden
              className="text-muted-foreground"
              icon={themeToggleIcon}
              strokeWidth={2}
            />
            Toggle theme
          </CommandItem>
        ) : null}
      </CommandGroup>
    </>
  );
}
