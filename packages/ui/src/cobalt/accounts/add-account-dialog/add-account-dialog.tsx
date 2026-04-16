import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { Input } from "@cobalt-web/ui/components/input";

import { AddAccountGrid } from "./add-account-grid";
import type { AddAccountInstitution } from "./types";

export interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plaidInstitutions: readonly {
    id: string;
    name: string;
    logo: string | null;
    url: string | null;
  }[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onChoose: (institution: AddAccountInstitution) => void;
}

export function AddAccountDialog({
  open,
  onOpenChange,
  plaidInstitutions,
  searchQuery,
  onSearchQueryChange,
  onChoose,
}: AddAccountDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-[max(6rem,13svh)] flex h-[600px] w-[860px] max-w-[calc(100vw-2rem)] translate-y-0 flex-col gap-0 overflow-hidden border-0 bg-[oklch(0.949_0_0)] p-0 shadow-2xl sm:max-w-[860px] dark:bg-[oklch(0.29_0_0)]"
        overlayClassName="bg-black/25 supports-backdrop-filter:backdrop-blur-none"
      >
        <DialogHeader className="px-4 py-3">
          <DialogTitle className="sr-only">Add an account</DialogTitle>
          <DialogDescription className="sr-only">
            Search and connect a bank, credit card, or brokerage.
          </DialogDescription>
          <Input
            autoFocus
            className="h-11 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 md:text-base"
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
            }}
            placeholder="Search 13,000+ banks, cards, and brokerages..."
            value={searchQuery}
          />
        </DialogHeader>

        <AddAccountGrid
          onChoose={onChoose}
          plaidInstitutions={plaidInstitutions}
          searchQuery={searchQuery}
        />
      </DialogContent>
    </Dialog>
  );
}
