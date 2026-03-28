// @ts-nocheck
import { Button } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import {
  ComputerIcon,
  Moon02Icon,
  Sun02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import * as React from "react";

export function ModeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        aria-label="Toggle theme"
        className="relative"
        disabled
        size="icon-sm"
        variant="outline"
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Toggle theme"
            className="relative"
            size="icon-sm"
            variant="outline"
          />
        }
      >
        <HugeiconsIcon
          className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          icon={Sun02Icon}
          strokeWidth={2}
        />
        <HugeiconsIcon
          className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          icon={Moon02Icon}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <HugeiconsIcon icon={Sun02Icon} strokeWidth={2} />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
