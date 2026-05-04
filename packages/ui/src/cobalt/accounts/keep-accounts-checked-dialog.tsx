import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/alert-dialog";

/**
 * Pre-flight warning for any Plaid Link flow that opens with the account
 * picker (update mode add-accounts, and reauth against OAuth institutions
 * where Plaid always shows the picker regardless of `account_selection_enabled`).
 *
 * Unchecking a connected account in the Plaid picker causes our sync to
 * reconcile it away — and the FK cascade wipes its transactions, balances,
 * snapshots, recurring streams, liabilities, and investment data. This
 * dialog exists solely to warn the user before that's possible.
 */
export function KeepAccountsCheckedDialog({
  onCancel,
  onConfirm,
  open,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
      open={open}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Keep existing accounts checked</AlertDialogTitle>
          <AlertDialogDescription>Unchecking any deletes its history.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} size="sm">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
