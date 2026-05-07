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
      <DialogContent className="h-[600px] w-[860px] gap-0 p-0 sm:max-w-[860px]">
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
