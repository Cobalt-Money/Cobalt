-- SRI-264 Migration B: backfill old → new unified tables.
--
-- Order matters: parents before children. Children resolve their account_id
-- by JOIN through (source, external_id) into financial_account, which is
-- backfilled FIRST.
--
-- Idempotent via ON CONFLICT DO NOTHING on partial unique indexes.

-- =====================================================================
-- 1. plaid_connection ← bank_connection
-- =====================================================================
INSERT INTO plaid_connection (
  id, user_id, plaid_item_id, plaid_access_token, transactions_cursor,
  recurring_updated_datetime, webhook_url, available_products, billed_products,
  error, institution_id, institution_name, institution_logo,
  new_accounts_available, pending_disconnect_at, created_at, updated_at
)
SELECT
  bc.id, bc.user_id, bc.plaid_item_id, bc.plaid_access_token, bc.transactions_cursor,
  CASE WHEN bc.recurring_updated_datetime IS NOT NULL THEN bc.recurring_updated_datetime::timestamptz ELSE NULL END,
  bc.webhook_url, bc.available_products, bc.billed_products,
  bc.error, bc.institution_id, bc.institution_name, bc.institution_logo,
  bc.new_accounts_available, bc.pending_disconnect_at, bc.created_at, bc.updated_at
FROM bank_connection bc
ON CONFLICT (plaid_item_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 2. snaptrade_authorization ← brokerage_authorization
-- =====================================================================
INSERT INTO snaptrade_authorization (
  id, user_id, authorization_id, brokerage, brokerage_slug, name, type,
  is_disabled, is_eligible_for_payout, disabled_at, meta, created_at, updated_at
)
SELECT
  ba.id, ba.user_id, ba.authorization_id, ba.brokerage, ba.brokerage_slug, ba.name, ba.type,
  CASE WHEN ba.is_disabled = 1 THEN true ELSE false END,
  CASE WHEN ba.is_eligible_for_payout = 1 THEN true ELSE false END,
  ba.disabled_at, ba.meta, ba.created_at, ba.updated_at
FROM brokerage_authorization ba
ON CONFLICT (authorization_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 3. snaptrade_user ← brokerage_user
-- =====================================================================
INSERT INTO snaptrade_user (
  user_id, snaptrade_user_id, snaptrade_user_secret, last_verified_at, created_at
)
SELECT
  bu.user_id, bu.snaptrade_user_id, bu.snaptrade_user_secret, bu.last_verified_at, bu.created_at
FROM brokerage_user bu
ON CONFLICT (user_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 4. financial_account ← bank_account + brokerage_account
-- =====================================================================
INSERT INTO financial_account (
  source, external_id, user_id, plaid_connection_id,
  name, official_name, mask, type, subtype, verification_status,
  persistent_account_id, created_at, updated_at
)
SELECT
  'plaid', a.plaid_account_id, pc.user_id, pc.id,
  a.name, a.official_name, a.mask, a.type, a.subtype, a.verification_status,
  a.persistent_account_id, a.created_at::timestamptz, a.updated_at::timestamptz
FROM bank_account a
JOIN plaid_connection pc ON pc.plaid_item_id = a.plaid_item_id;
--> statement-breakpoint

INSERT INTO financial_account (
  source, external_id, user_id, snaptrade_authorization_id,
  name, account_number, type, status, institution_name,
  portfolio_group, sync_status, last_sync_at, provider_created_at,
  created_at, updated_at
)
SELECT
  'snaptrade', ba.account_id, ba.user_id, sa.id,
  ba.name, ba.account_number, ba.account_type, ba.account_status, ba.institution_name,
  ba.portfolio_group, ba.sync_status, ba.last_sync, ba.created_date,
  ba.created_at, ba.updated_at
FROM brokerage_account ba
JOIN snaptrade_authorization sa ON sa.id = ba.brokerage_auth_id;
--> statement-breakpoint

-- =====================================================================
-- 5. security ← investment_security + DISTINCT brokerage_position cols
-- =====================================================================
INSERT INTO security (
  source, external_id, name, ticker_symbol, cusip, isin, sedol,
  type, subtype, iso_currency_code, unofficial_currency_code,
  is_cash_equivalent, close_price, close_price_as_of, update_datetime,
  industry, sector, institution_id, institution_security_id, proxy_security_id,
  market_identifier_code, fixed_income, option_contract, created_at, updated_at
)
SELECT
  'plaid', isec.security_id, isec.name, isec.ticker_symbol, isec.cusip, isec.isin, isec.sedol,
  isec.type, isec.subtype, isec.iso_currency_code, isec.unofficial_currency_code,
  isec.is_cash_equivalent, isec.close_price::numeric(28,10),
  CASE WHEN isec.close_price_as_of ~ '^\d{4}-\d{2}-\d{2}$' THEN isec.close_price_as_of::date ELSE NULL END,
  CASE WHEN isec.update_datetime IS NOT NULL THEN isec.update_datetime::timestamptz ELSE NULL END,
  isec.industry, isec.sector, isec.institution_id, isec.institution_security_id, isec.proxy_security_id,
  isec.market_identifier_code, isec.fixed_income, isec.option_contract, isec.created_at, isec.updated_at
FROM investment_security isec;
--> statement-breakpoint

INSERT INTO security (
  source, external_id, name, ticker_symbol, figi_code, type, subtype,
  iso_currency_code, exchange_code, exchange_name, market_identifier_code,
  created_at, updated_at
)
SELECT DISTINCT ON (bp.symbol_id)
  'snaptrade', bp.symbol_id, bp.symbol_description, bp.raw_symbol, bp.figi_code,
  bp.security_type_code, bp.security_type_description,
  bp.currency_code, bp.exchange_code, bp.exchange_name, bp.exchange_mic_code,
  bp.created_at, bp.updated_at
FROM brokerage_position bp
WHERE bp.symbol_id IS NOT NULL;
--> statement-breakpoint

-- =====================================================================
-- 6. balance ← bank_balance + brokerage_balance
-- =====================================================================
INSERT INTO balance (
  account_id, user_id, current, available, "limit",
  iso_currency_code, unofficial_currency_code, user_override_credit_limit,
  created_at, updated_at
)
SELECT
  fa.id, fa.user_id,
  bb.current::numeric(19,4),
  bb.available::numeric(19,4),
  bb."limit"::numeric(19,4),
  bb.iso_currency_code, bb.unofficial_currency_code,
  bb.user_override_credit_limit::numeric(19,4),
  bb.created_at::timestamptz, bb.updated_at::timestamptz
FROM bank_balance bb
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = bb.plaid_account_id
ON CONFLICT (account_id) DO NOTHING;
--> statement-breakpoint

INSERT INTO balance (
  account_id, user_id, current, available, buying_power,
  iso_currency_code, last_sync_at, created_at, updated_at
)
SELECT
  fa.id, fa.user_id,
  COALESCE(brb.cash, 0)::numeric(19,4),
  brb.cash::numeric(19,4),
  brb.buying_power::numeric(19,4),
  brb.currency_code, brb.last_sync, brb.created_at, brb.updated_at
FROM brokerage_balance brb
JOIN brokerage_account ba ON ba.id = brb.account_id
JOIN financial_account fa ON fa.source = 'snaptrade' AND fa.external_id = ba.account_id
ON CONFLICT (account_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 7. snapshot ← bank_balance_snapshot + portfolio_snapshot
-- =====================================================================
INSERT INTO snapshot (
  source, account_id, user_id, snapshot_date, current, available, "limit", created_at
)
SELECT
  'plaid', fa.id, fa.user_id, bbs.snapshot_date,
  bbs.current_balance::numeric(19,4),
  bbs.available_balance::numeric(19,4),
  bbs.credit_limit::numeric(19,4),
  bbs.created_at::timestamptz
FROM bank_balance_snapshot bbs
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = bbs.plaid_account_id
ON CONFLICT (account_id, snapshot_date) DO NOTHING;
--> statement-breakpoint

-- portfolio_snapshot.account_id is the INTERNAL brokerage_account.id uuid (text-typed),
-- NOT the snaptrade external account_id. Resolve via brokerage_account → financial_account.
-- Some old rows are orphaned (account_id refs a deleted brokerage_account) and are skipped.
INSERT INTO snapshot (
  source, account_id, user_id, snapshot_date,
  current, available, buying_power, positions_value, positions_count, iso_currency_code,
  created_at
)
SELECT
  'snaptrade', fa.id, ps.user_id, ps.snapshot_date,
  ps.total_value::numeric(19,4),
  ps.cash_value::numeric(19,4),
  ps.buying_power::numeric(19,4),
  ps.positions_value::numeric(19,4),
  ps.positions_count,
  ps.currency_code,
  ps.created_at
FROM portfolio_snapshot ps
JOIN brokerage_account ba ON ba.id::text = ps.account_id
JOIN financial_account fa ON fa.source = 'snaptrade' AND fa.external_id = ba.account_id
ON CONFLICT (account_id, snapshot_date) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 8. holding ← investment_position + brokerage_position
-- =====================================================================
INSERT INTO holding (
  source, account_id, user_id, security_id,
  quantity, cost_basis, institution_price, institution_value,
  institution_price_as_of, institution_price_datetime,
  iso_currency_code, unofficial_currency_code,
  vested_quantity, vested_value, created_at, updated_at
)
SELECT
  'plaid', fa.id, fa.user_id, sec.id,
  ip.quantity::numeric(28,10),
  ip.cost_basis::numeric(19,4),
  ip.institution_price::numeric(28,10),
  ip.institution_value::numeric(19,4),
  CASE WHEN ip.institution_price_as_of ~ '^\d{4}-\d{2}-\d{2}$' THEN ip.institution_price_as_of::date ELSE NULL END,
  CASE WHEN ip.institution_price_datetime IS NOT NULL THEN ip.institution_price_datetime::timestamptz ELSE NULL END,
  ip.iso_currency_code, ip.unofficial_currency_code,
  ip.vested_quantity::numeric(28,10),
  ip.vested_value::numeric(19,4),
  ip.created_at, ip.updated_at
FROM investment_position ip
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = ip.plaid_account_id
JOIN security sec ON sec.source = 'plaid' AND sec.external_id = ip.security_id
ON CONFLICT (account_id, security_id) DO NOTHING;
--> statement-breakpoint

INSERT INTO holding (
  source, account_id, user_id, security_id,
  quantity, average_price, institution_price, open_pnl,
  iso_currency_code, is_quotable, is_tradable, last_sync_at,
  created_at, updated_at
)
SELECT
  'snaptrade', fa.id, fa.user_id, sec.id,
  bp.units::numeric(28,10),
  bp.average_purchase_price::numeric(28,10),
  bp.price::numeric(28,10),
  bp.open_pnl::numeric(19,4),
  bp.currency_code, bp.is_quotable, bp.is_tradable, bp.last_sync,
  bp.created_at, bp.updated_at
FROM brokerage_position bp
JOIN brokerage_account ba ON ba.id = bp.account_id
JOIN financial_account fa ON fa.source = 'snaptrade' AND fa.external_id = ba.account_id
JOIN security sec ON sec.source = 'snaptrade' AND sec.external_id = bp.symbol_id
WHERE bp.symbol_id IS NOT NULL
ON CONFLICT (account_id, security_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 9. transaction_v2 ← transaction
-- =====================================================================
INSERT INTO transaction_v2 (
  source, external_id, account_id, user_id,
  amount, date, datetime, authorized_date, authorized_datetime,
  name, merchant_name, merchant_entity_id, logo_url, website,
  category, category_id, personal_finance_category, personal_finance_category_icon_url,
  counterparties, location, payment_meta, payment_channel,
  pending, pending_transaction_id, transaction_code, transaction_type,
  account_owner, check_number, iso_currency_code, unofficial_currency_code,
  original_description, notes,
  user_override_category, user_override_date, user_override_location, user_override_name,
  created_at, updated_at
)
SELECT
  'plaid', t.plaid_transaction_id, fa.id, fa.user_id,
  t.amount::numeric(19,4), t.date,
  CASE WHEN t.datetime IS NOT NULL THEN t.datetime::timestamptz ELSE NULL END,
  t.authorized_date,
  CASE WHEN t.authorized_datetime IS NOT NULL THEN t.authorized_datetime::timestamptz ELSE NULL END,
  t.name, t.merchant_name, t.merchant_entity_id, t.logo_url, t.website,
  t.category, t.category_id, t.personal_finance_category, t.personal_finance_category_icon_url,
  t.counterparties, t.location, t.payment_meta, t.payment_channel,
  t.pending, t.pending_transaction_id, t.transaction_code, t.transaction_type,
  t.account_owner, t.check_number, t.iso_currency_code, t.unofficial_currency_code,
  t.original_description, t.notes,
  t.user_override_category, t.user_override_date, t.user_override_location, t.user_override_name,
  t.created_at::timestamptz, t.updated_at::timestamptz
FROM transaction t
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = t.plaid_account_id;
--> statement-breakpoint

-- =====================================================================
-- 10. investment_activity_v2 ← investment_activity + brokerage_activity
-- =====================================================================
INSERT INTO investment_activity_v2 (
  source, external_id, account_id, user_id, security_id,
  type, subtype, amount, quantity, price, fees,
  date, name, iso_currency_code, unofficial_currency_code, cancel_transaction_id,
  created_at, updated_at
)
SELECT
  'plaid', ia.investment_transaction_id, fa.id, fa.user_id, sec.id,
  ia.type, ia.subtype,
  ia.amount::numeric(19,4),
  ia.quantity::numeric(28,10),
  ia.price::numeric(28,10),
  ia.fees::numeric(19,4),
  ia.date::date,
  ia.name, ia.iso_currency_code, ia.unofficial_currency_code, ia.cancel_transaction_id,
  ia.created_at, NOW()
FROM investment_activity ia
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = ia.plaid_account_id
LEFT JOIN security sec ON sec.source = 'plaid' AND sec.external_id = ia.security_id;
--> statement-breakpoint

INSERT INTO investment_activity_v2 (
  source, external_id, account_id, user_id, security_id,
  type, amount, quantity, price, fees,
  date, settlement_date, name, iso_currency_code,
  external_reference_id, option_type, fx_rate, created_at, updated_at
)
SELECT
  'snaptrade', bact.activity_id, fa.id, fa.user_id, sec.id,
  COALESCE(bact.type, 'unknown'),
  COALESCE(bact.amount, 0)::numeric(19,4),
  bact.units::numeric(28,10),
  bact.price::numeric(28,10),
  bact.fee::numeric(19,4),
  COALESCE(bact.trade_date, CURRENT_DATE),
  bact.settlement_date,
  COALESCE(bact.description, bact.type, 'activity'),
  bact.currency_code,
  bact.external_reference_id, bact.option_type,
  bact.fx_rate::numeric(19,8),
  bact.created_at, bact.updated_at
FROM brokerage_activity bact
JOIN brokerage_account ba ON ba.id = bact.account_id
JOIN financial_account fa ON fa.source = 'snaptrade' AND fa.external_id = ba.account_id
LEFT JOIN security sec ON sec.source = 'snaptrade' AND sec.external_id = bact.symbol_id;
--> statement-breakpoint

-- =====================================================================
-- 11. orders ← brokerage_order (snaptrade-only)
-- =====================================================================
INSERT INTO orders (
  external_id, account_id, user_id, security_id,
  action, order_type, time_in_force, status,
  total_quantity, filled_quantity, open_quantity, canceled_quantity,
  limit_price, stop_price, execution_price, strike_price,
  option_type, option_symbol, is_mini_option,
  expiry_date, expiration_date, time_placed, time_updated, time_executed,
  iso_currency_code, child_brokerage_order_ids, created_at, updated_at
)
SELECT
  bo.brokerage_order_id, fa.id, fa.user_id, sec.id,
  bo.action, bo.order_type, bo.time_in_force, bo.status,
  bo.total_quantity::numeric(28,10),
  bo.filled_quantity::numeric(28,10),
  bo.open_quantity::numeric(28,10),
  bo.canceled_quantity::numeric(28,10),
  bo.limit_price::numeric(28,10),
  bo.stop_price::numeric(28,10),
  bo.execution_price::numeric(28,10),
  bo.strike_price::numeric(28,10),
  bo.option_type, bo.option_symbol, bo.is_mini_option,
  bo.expiry_date, bo.expiration_date, bo.time_placed, bo.time_updated, bo.time_executed,
  bo.currency_code, bo.child_brokerage_order_ids, bo.created_at, bo.updated_at
FROM brokerage_order bo
JOIN brokerage_account ba ON ba.id = bo.account_id
JOIN financial_account fa ON fa.source = 'snaptrade' AND fa.external_id = ba.account_id
LEFT JOIN security sec ON sec.source = 'snaptrade' AND sec.external_id = bo.symbol_id
ON CONFLICT (external_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 12. recurring_stream_v2 ← recurring_stream
-- =====================================================================
INSERT INTO recurring_stream_v2 (
  source, external_id, account_id, user_id,
  description, merchant_name, category, category_id, personal_finance_category,
  frequency, status, stream_type, is_active, is_user_modified,
  last_user_modified_datetime, average_amount, last_amount,
  first_date, last_date, predicted_next_date, transaction_ids,
  created_at, updated_at
)
SELECT
  'plaid', rs.stream_id, fa.id, fa.user_id,
  rs.description, rs.merchant_name, rs.category, rs.category_id, rs.personal_finance_category,
  rs.frequency, rs.status, rs.stream_type, rs.is_active, rs.is_user_modified,
  CASE WHEN rs.last_user_modified_datetime IS NOT NULL THEN rs.last_user_modified_datetime::timestamptz ELSE NULL END,
  rs.average_amount::numeric(19,4),
  rs.last_amount::numeric(19,4),
  rs.first_date::date,
  rs.last_date::date,
  CASE WHEN rs.predicted_next_date IS NOT NULL THEN rs.predicted_next_date::date ELSE NULL END,
  rs.transaction_ids,
  rs.created_at::timestamptz, rs.updated_at::timestamptz
FROM recurring_stream rs
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = rs.plaid_account_id;
--> statement-breakpoint

-- =====================================================================
-- 13. credit_liability_v2 ← credit_liability
-- =====================================================================
INSERT INTO credit_liability_v2 (
  account_id, user_id, aprs, is_overdue,
  last_payment_amount, last_payment_date, last_statement_balance, last_statement_issue_date,
  minimum_payment_amount, next_payment_due_date, created_at, updated_at
)
SELECT
  fa.id, fa.user_id, cl.aprs, cl.is_overdue,
  cl.last_payment_amount::numeric(19,4),
  CASE WHEN cl.last_payment_date IS NOT NULL THEN cl.last_payment_date::date ELSE NULL END,
  cl.last_statement_balance::numeric(19,4),
  CASE WHEN cl.last_statement_issue_date IS NOT NULL THEN cl.last_statement_issue_date::date ELSE NULL END,
  cl.minimum_payment_amount::numeric(19,4),
  CASE WHEN cl.next_payment_due_date IS NOT NULL THEN cl.next_payment_due_date::date ELSE NULL END,
  cl.created_at::timestamptz, cl.updated_at::timestamptz
FROM credit_liability cl
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = cl.plaid_account_id
ON CONFLICT (account_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 14. mortgage_liability_v2 ← mortgage_liability
-- =====================================================================
INSERT INTO mortgage_liability_v2 (
  account_id, user_id, account_number, current_late_fee, escrow_balance,
  has_pmi, has_prepayment_penalty, interest_rate,
  last_payment_amount, last_payment_date, loan_term, loan_type_description,
  maturity_date, next_monthly_payment, next_payment_due_date,
  origination_date, origination_principal_amount, past_due_amount,
  property_address, ytd_interest_paid, ytd_principal_paid, created_at, updated_at
)
SELECT
  fa.id, fa.user_id, ml.account_number,
  ml.current_late_fee::numeric(19,4),
  ml.escrow_balance::numeric(19,4),
  ml.has_pmi, ml.has_prepayment_penalty, ml.interest_rate,
  ml.last_payment_amount::numeric(19,4),
  CASE WHEN ml.last_payment_date IS NOT NULL THEN ml.last_payment_date::date ELSE NULL END,
  ml.loan_term, ml.loan_type_description,
  CASE WHEN ml.maturity_date IS NOT NULL THEN ml.maturity_date::date ELSE NULL END,
  ml.next_monthly_payment::numeric(19,4),
  CASE WHEN ml.next_payment_due_date IS NOT NULL THEN ml.next_payment_due_date::date ELSE NULL END,
  CASE WHEN ml.origination_date IS NOT NULL THEN ml.origination_date::date ELSE NULL END,
  ml.origination_principal_amount::numeric(19,4),
  ml.past_due_amount::numeric(19,4),
  ml.property_address,
  ml.ytd_interest_paid::numeric(19,4),
  ml.ytd_principal_paid::numeric(19,4),
  ml.created_at::timestamptz, ml.updated_at::timestamptz
FROM mortgage_liability ml
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = ml.plaid_account_id
ON CONFLICT (account_id) DO NOTHING;
--> statement-breakpoint

-- =====================================================================
-- 15. student_loan_liability_v2 ← student_loan_liability
-- =====================================================================
INSERT INTO student_loan_liability_v2 (
  account_id, user_id, account_number, disbursement_dates, expected_payoff_date,
  guarantor, interest_rate_percentage, is_overdue,
  last_payment_amount, last_payment_date, last_statement_balance, last_statement_issue_date,
  loan_name, loan_status, minimum_payment_amount, next_payment_due_date,
  origination_date, origination_principal_amount, outstanding_interest_amount,
  payment_reference_number, pslf_status, repayment_plan, sequence_number, servicer_address,
  ytd_interest_paid, ytd_principal_paid, created_at, updated_at
)
SELECT
  fa.id, fa.user_id, sl.account_number, sl.disbursement_dates,
  CASE WHEN sl.expected_payoff_date IS NOT NULL THEN sl.expected_payoff_date::date ELSE NULL END,
  sl.guarantor,
  sl.interest_rate_percentage::numeric(9,6),
  sl.is_overdue,
  sl.last_payment_amount::numeric(19,4),
  CASE WHEN sl.last_payment_date IS NOT NULL THEN sl.last_payment_date::date ELSE NULL END,
  sl.last_statement_balance::numeric(19,4),
  CASE WHEN sl.last_statement_issue_date IS NOT NULL THEN sl.last_statement_issue_date::date ELSE NULL END,
  sl.loan_name, sl.loan_status,
  sl.minimum_payment_amount::numeric(19,4),
  CASE WHEN sl.next_payment_due_date IS NOT NULL THEN sl.next_payment_due_date::date ELSE NULL END,
  CASE WHEN sl.origination_date IS NOT NULL THEN sl.origination_date::date ELSE NULL END,
  sl.origination_principal_amount::numeric(19,4),
  sl.outstanding_interest_amount::numeric(19,4),
  sl.payment_reference_number, sl.pslf_status, sl.repayment_plan, sl.sequence_number, sl.servicer_address,
  sl.ytd_interest_paid::numeric(19,4),
  sl.ytd_principal_paid::numeric(19,4),
  sl.created_at::timestamptz, sl.updated_at::timestamptz
FROM student_loan_liability sl
JOIN financial_account fa ON fa.source = 'plaid' AND fa.external_id = sl.plaid_account_id
ON CONFLICT (account_id) DO NOTHING;
