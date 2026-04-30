import type { TagOption } from "@cobalt-web/ui/cobalt/tags/tag-picker";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type {
  AddTransactionAccountOption,
  AddTransactionFormValues,
  GeocodeSearchState,
  MerchantSearchState,
} from "@cobalt-web/ui/cobalt/transactions/add-transaction-dialog";
import { mutators, queries } from "@cobalt-web/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useCallback, useMemo, useState } from "react";

import { useGeocodeSearch } from "@/hooks/use-geocode-search";
import { useMerchantSearch } from "@/hooks/use-merchant-search";
import { useTagOptions } from "@/hooks/use-tags";
import { transactionsApi } from "@/lib/clients/api-client";

export interface AddTransactionData {
  manualAccounts: readonly AddTransactionAccountOption[];
  locationSearch: GeocodeSearchState;
  merchantSearch: MerchantSearchState;
  availableTags: readonly TagOption[];
  submit: (values: AddTransactionFormValues) => Promise<void>;
}

/** All data + submit wiring for the command-palette `add-transaction` sub-page. */
export function useAddTransactionData(): AddTransactionData {
  const zero = useZero();

  const [bankAccounts] = useQuery(queries.accounts.bankAccounts());
  const manualAccounts = useMemo<readonly AddTransactionAccountOption[]>(() => {
    const rows = (bankAccounts ?? []) as readonly {
      id: unknown;
      name: unknown;
      source: unknown;
    }[];
    return rows
      .filter((a) => a.source === "manual")
      .map((a) => ({
        id: String(a.id),
        name: String(a.name),
      }));
  }, [bankAccounts]);

  const [locationQuery, setLocationQuery] = useState("");
  const { data: locationResults = [], isFetching: locationLoading } =
    useGeocodeSearch(locationQuery);
  const locationSearch = useMemo<GeocodeSearchState>(
    () => ({
      loading: locationLoading,
      onQueryChange: setLocationQuery,
      results: locationResults,
    }),
    [locationLoading, locationResults]
  );

  const [merchantQuery, setMerchantQuery] = useState("");
  const { data: merchantResults = [], isFetching: merchantLoading } =
    useMerchantSearch(merchantQuery);
  const merchantSearch = useMemo<MerchantSearchState>(
    () => ({
      loading: merchantLoading,
      onQueryChange: setMerchantQuery,
      results: merchantResults.map((r) => ({
        brandId: r.brandId,
        domain: r.domain,
        icon: r.icon,
        name: r.name,
      })),
    }),
    [merchantLoading, merchantResults]
  );

  const { options: availableTags } = useTagOptions();

  const submit = useCallback(
    (values: AddTransactionFormValues): Promise<void> => {
      const newId = crypto.randomUUID();
      const { server } = zero.mutate(
        mutators.transaction.createTransaction({
          accountId: values.accountId,
          amount: values.amount,
          category: values.category
            ? { detailed: "", primary: values.category }
            : undefined,
          date: values.date,
          description: values.description ?? undefined,
          id: newId,
          location: values.location ?? undefined,
          merchantName: values.merchantName ?? undefined,
          name: values.name,
          website: values.merchantWebsite ?? undefined,
        })
      );
      cobaltToast.transactionAdded(values.name);
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            cobaltToast.error(
              result.error.message || "Couldn't add transaction."
            );
            return;
          }
          if (values.tagIds.length > 0) {
            const res = await transactionsApi[":transactionId"].$patch({
              json: { tags: values.tagIds },
              param: { transactionId: newId },
            });
            if (!res.ok) {
              cobaltToast.error("Transaction created, but tagging failed.");
            }
          }
        } catch (error) {
          console.error("Failed to add transaction", error);
          cobaltToast.error("Couldn't add transaction. Please try again.");
        }
      })();
      return Promise.resolve();
    },
    [zero]
  );

  return {
    availableTags,
    locationSearch,
    manualAccounts,
    merchantSearch,
    submit,
  };
}
