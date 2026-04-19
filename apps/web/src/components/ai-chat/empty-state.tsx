import { usePromptInputController } from "@cobalt-web/ui/components/ai-elements/prompt-input";
import {
  ChartLineData01Icon,
  CreditCardIcon,
  DollarCircleIcon,
  PieChartIcon,
  Target02Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { useAppSession } from "@/lib/providers/app-session";

interface QuickAction {
  title: string;
  prompt: string;
  icon: typeof PieChartIcon;
}

const ROW_1: QuickAction[] = [
  {
    icon: CreditCardIcon,
    prompt: "How much did I spend on food last month?",
    title: "How much did I spend on food last month?",
  },
  {
    icon: ChartLineData01Icon,
    prompt: "Can I pay off my car loan if I sell some of my Nvidia shares?",
    title: "Can I pay off my car loan with Nvidia shares?",
  },
  {
    icon: PieChartIcon,
    prompt: "How much left in subscription fees do I have to pay?",
    title: "How much left in subscription fees?",
  },
];

const ROW_2: QuickAction[] = [
  {
    icon: Target02Icon,
    prompt: "How much are my Tesla shares expected to go up next year?",
    title: "How much will my Tesla shares go up next year?",
  },
  {
    icon: ChartLineData01Icon,
    prompt: "How bad are the tariffs going to affect my Tesla shares?",
    title: "How will tariffs affect my Tesla shares?",
  },
  {
    icon: Wallet02Icon,
    prompt: "How much runway if I quit my job and moved to SF?",
    title: "How much runway if I quit and move to SF?",
  },
];

const ROW_3: QuickAction[] = [
  {
    icon: ChartLineData01Icon,
    prompt: "Which markets do I lose the most money on?",
    title: "Which markets do I lose the most money on?",
  },
  {
    icon: Target02Icon,
    prompt: "How much did I miss on gains by selling Google too early?",
    title: "How much did I miss selling Google early?",
  },
  {
    icon: DollarCircleIcon,
    prompt: "Did Mark pay me back for lunch?",
    title: "Did Mark pay me back for lunch?",
  },
];

const ROW_DURATION_PER_ITEM = 15;

interface QuickStartRowProps {
  actions: QuickAction[];
  reverse?: boolean;
  rowKey: string;
  onQuickStart: (prompt: string) => void;
}

function QuickStartRow({
  actions,
  reverse = false,
  rowKey,
  onQuickStart,
}: QuickStartRowProps) {
  const duplicated = (["a", "b", "c"] as const).flatMap((copy) =>
    actions.map((action) => ({ ...action, copy }))
  );
  const from = reverse ? `-${(actions.length * 100) / 3}%` : "0%";
  const to = reverse ? "0%" : `-${(actions.length * 100) / 3}%`;

  return (
    <div
      className="relative w-full overflow-x-hidden overflow-y-visible pb-1"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 18%, black 82%, transparent)",
        maskImage:
          "linear-gradient(to right, transparent, black 18%, black 82%, transparent)",
      }}
    >
      <motion.div
        animate={{ x: [from, to] }}
        className="flex gap-3"
        transition={{
          x: {
            duration: ROW_DURATION_PER_ITEM * actions.length,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
          },
        }}
      >
        {duplicated.map((action) => (
          <button
            className="group flex shrink-0 cursor-pointer items-center gap-3 rounded-2xl bg-input/30 px-6 py-4 transition-colors hover:bg-input/50"
            key={`${rowKey}-${action.copy}-${action.title}`}
            onClick={() => onQuickStart(action.prompt)}
            type="button"
          >
            <HugeiconsIcon
              className="size-5 text-muted-foreground"
              icon={action.icon}
            />
            <span className="whitespace-nowrap font-medium text-base">
              {action.title}
            </span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}

export function ChatEmptyState() {
  const { data: session } = useAppSession();
  const firstName = session?.user.name?.split(" ")[0] ?? "";
  const { textInput } = usePromptInputController();
  const [isVisible, setIsVisible] = useState(textInput.value.length === 0);

  useEffect(() => {
    setIsVisible(textInput.value.length === 0);
  }, [textInput.value]);

  const handleQuickStart = (prompt: string) => {
    textInput.setInput(prompt);
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className="mx-auto flex h-full w-full max-w-[44rem] flex-col items-center justify-center pb-32"
          exit={{ filter: "blur(4px)", opacity: 0, y: -8 }}
          initial={false}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="mb-12 text-center">
            <h1 className="mb-1 font-bold text-2xl text-foreground md:text-4xl">
              Hey{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="font-normal text-2xl text-muted-foreground">
              What do you want to ask your money?
            </p>
          </div>

          <div className="w-full space-y-3">
            <QuickStartRow
              actions={ROW_1}
              onQuickStart={handleQuickStart}
              rowKey="row1"
            />
            <QuickStartRow
              actions={ROW_2}
              onQuickStart={handleQuickStart}
              reverse
              rowKey="row2"
            />
            <QuickStartRow
              actions={ROW_3}
              onQuickStart={handleQuickStart}
              rowKey="row3"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
