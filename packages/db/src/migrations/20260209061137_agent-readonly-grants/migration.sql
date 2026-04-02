-- Create read-only role for AI agent SQL execution
DO $$ BEGIN
  CREATE ROLE agent_readonly NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant schema access
GRANT USAGE ON SCHEMA public TO agent_readonly;

-- Grant SELECT only on user-scoped data tables
GRANT SELECT ON
  "user",
  plaid_items,
  plaid_accounts,
  plaid_transactions,
  plaid_balances,
  plaid_credit_liabilities,
  plaid_recurring_streams,
  brokerage_accounts,
  brokerage_positions,
  brokerage_balances,
  brokerage_activities,
  brokerage_orders,
  brokerage_account_details,
  brokerage_portfolio_snapshots,
  chats,
  messages,
  parts,
  financial_goals,
  account_balance_snapshots,
  snaptrade_users,
  kalshi_users,
  feedback
TO agent_readonly;

-- Grant SELECT on reference tables (public read)
GRANT SELECT ON plaid_institutions TO agent_readonly;

-- Allow the postgres role to SET ROLE to agent_readonly (needed for transaction switching)
GRANT agent_readonly TO postgres;

-- Grant authenticated role to agent_readonly so RLS policies (defined for "authenticated") apply
GRANT authenticated TO agent_readonly;

-- Force RLS on all user-scoped tables
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;
ALTER TABLE plaid_items FORCE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE plaid_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE plaid_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE plaid_credit_liabilities FORCE ROW LEVEL SECURITY;
ALTER TABLE plaid_recurring_streams FORCE ROW LEVEL SECURITY;
ALTER TABLE brokerage_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE brokerage_positions FORCE ROW LEVEL SECURITY;
ALTER TABLE brokerage_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE brokerage_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE brokerage_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE brokerage_account_details FORCE ROW LEVEL SECURITY;
ALTER TABLE brokerage_portfolio_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE account_balance_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE chats FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE parts FORCE ROW LEVEL SECURITY;
ALTER TABLE financial_goals FORCE ROW LEVEL SECURITY;
ALTER TABLE kalshi_users FORCE ROW LEVEL SECURITY;
ALTER TABLE snaptrade_users FORCE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;