import { plaidClient } from "@cobalt-web/clients/plaid";
import type { Holding, InvestmentTransaction, Security } from "plaid";

/** Fetch the current holdings snapshot from Plaid. */
export async function fetchHoldings(
  accessToken: string
): Promise<{ holdings: Holding[]; securities: Security[] }> {
  const response = await plaidClient.investmentsHoldingsGet({
    access_token: accessToken,
  });
  return {
    holdings: response.data.holdings,
    securities: response.data.securities,
  };
}

/** Fetch a single page of investment transactions from Plaid. */
export async function fetchInvestmentTransactionsPage(
  accessToken: string,
  startDate: string,
  endDate: string,
  offset: number,
  count: number
): Promise<{
  transactions: InvestmentTransaction[];
  securities: Security[];
  totalAvailable: number;
}> {
  const response = await plaidClient.investmentsTransactionsGet({
    access_token: accessToken,
    end_date: endDate,
    options: { count, offset },
    start_date: startDate,
  });
  return {
    securities: response.data.securities,
    totalAvailable: response.data.total_investment_transactions,
    transactions: response.data.investment_transactions,
  };
}
