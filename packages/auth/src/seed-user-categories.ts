import type { db as Db } from "@cobalt-web/db";
import { sql } from "drizzle-orm";

/**
 * SRI-311: insert 16 system category groups + 88 system categories for a single user.
 * Idempotent: skipped if user already has any category_group row.
 *
 * Source of truth for the seed data lives in
 * `packages/server-data/src/transactions/categories/seed.ts`. This SQL must stay in
 * lockstep with that file and with `20260504100000_seed_system_categories/migration.sql`.
 */
export async function seedUserCategories(
  database: typeof Db,
  userId: string
): Promise<void> {
  await database.execute(sql`
WITH seed_groups (system_key, name, "order") AS (
  VALUES
    ('food_and_drink',           'Food & Drink',             10),
    ('transportation',           'Transportation',           20),
    ('rent_and_utilities',       'Rent & Utilities',         30),
    ('home_improvement',         'Home Improvement',         40),
    ('general_merchandise',      'Shopping',                 50),
    ('medical',                  'Medical',                  60),
    ('personal_care',            'Personal Care',            70),
    ('entertainment',            'Entertainment',            80),
    ('travel',                   'Travel',                   90),
    ('general_services',         'Services',                100),
    ('bank_fees',                'Bank Fees',               110),
    ('loan_payments',            'Loan Payments',           120),
    ('government_and_non_profit','Government & Non-Profit', 130),
    ('transfers',                'Transfers',               140),
    ('income',                   'Income',                  150),
    ('other',                    'Other',                   160)
),
target_user AS (
  SELECT ${userId}::text AS user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM category_group cg WHERE cg.user_id = ${userId}::text
  )
),
inserted_groups AS (
  INSERT INTO category_group (user_id, system_key, name, "order")
  SELECT tu.user_id, sg.system_key, sg.name, sg."order"
  FROM target_user tu
  CROSS JOIN seed_groups sg
  RETURNING id, user_id, system_key
),
seed_cats (group_key, system_key, name, exclude_from_insights, ord) AS (
  VALUES
    ('food_and_drink',  'groceries',           'Groceries',          false,  10),
    ('food_and_drink',  'restaurants',         'Restaurants',        false,  20),
    ('food_and_drink',  'coffee_shop',         'Coffee Shops',       false,  30),
    ('food_and_drink',  'alcohol_bars',        'Alcohol & Bars',     false,  40),
    ('food_and_drink',  'food_delivery',       'Food Delivery',      false,  50),
    ('food_and_drink',  'snacks',              'Snacks',             false,  60),
    ('transportation',  'public_transit',      'Public Transit',     false,  10),
    ('transportation',  'taxi',                'Rideshare & Taxi',   false,  20),
    ('transportation',  'gas_fuel',            'Gas & Fuel',         false,  30),
    ('transportation',  'parking',             'Parking',            false,  40),
    ('transportation',  'toll',                'Tolls',              false,  50),
    ('transportation',  'bike_scooter',        'Bikes & Scooters',   false,  60),
    ('transportation',  'auto_maintenance',    'Auto Maintenance',   false,  70),
    ('transportation',  'other_transportation','Other Transportation',false, 80),
    ('rent_and_utilities', 'rent_mortgage',    'Rent',               false,  10),
    ('rent_and_utilities', 'energy',           'Gas & Electric',     false,  20),
    ('rent_and_utilities', 'internet',         'Internet & Cable',   false,  30),
    ('rent_and_utilities', 'phone',            'Phone',              false,  40),
    ('rent_and_utilities', 'water',            'Water',              false,  50),
    ('rent_and_utilities', 'waste',            'Waste',              false,  60),
    ('rent_and_utilities', 'other_utilities',  'Other Utilities',    false,  70),
    ('home_improvement','home_maintenance',    'Home Maintenance',   false,  10),
    ('home_improvement','furniture',           'Furniture',          false,  20),
    ('home_improvement','hardware',            'Hardware',           false,  30),
    ('home_improvement','security',            'Security',           false,  40),
    ('home_improvement','other_home',          'Other Home',         false,  50),
    ('general_merchandise','shopping',         'General Shopping',   false,  10),
    ('general_merchandise','clothing',         'Clothing',           false,  20),
    ('general_merchandise','electronics',      'Electronics',        false,  30),
    ('general_merchandise','convenience_store','Convenience Store',  false,  40),
    ('general_merchandise','gift',             'Gifts',              false,  50),
    ('medical',         'primary',             'Primary Care',       false,  10),
    ('medical',         'dental',              'Dental',             false,  20),
    ('medical',         'eye_doctor',          'Eye Care',           false,  30),
    ('medical',         'pharmacy',            'Pharmacy',           false,  40),
    ('medical',         'nursing',             'Nursing',            false,  50),
    ('medical',         'vet',                 'Veterinary',         false,  60),
    ('medical',         'other_medical',       'Other Medical',      false,  70),
    ('personal_care',   'fitness',             'Gym & Fitness',      false,  10),
    ('personal_care',   'hair_beauty',         'Hair & Beauty',      false,  20),
    ('personal_care',   'laundry',             'Laundry',            false,  30),
    ('personal_care',   'vape',                'Tobacco & Vape',     false,  40),
    ('personal_care',   'other_personal_care', 'Other Personal Care',false,  50),
    ('entertainment',   'movies',              'TV & Movies',        false,  10),
    ('entertainment',   'streaming',           'Streaming',          false,  20),
    ('entertainment',   'music',               'Music',              false,  30),
    ('entertainment',   'video_games',         'Video Games',        false,  40),
    ('entertainment',   'event',               'Events',             false,  50),
    ('entertainment',   'sporting_goods',      'Sporting Goods',     false,  60),
    ('entertainment',   'books_media',         'Books & Media',      false,  70),
    ('entertainment',   'gambling',            'Gambling',           false,  80),
    ('entertainment',   'other_entertainment', 'Other Entertainment',false,  90),
    ('travel',          'flights',             'Flights',            false,  10),
    ('travel',          'hotels',              'Hotels',             false,  20),
    ('travel',          'rentals',             'Rental Cars',        false,  30),
    ('travel',          'other_travel',        'Other Travel',       false,  40),
    ('general_services','childcare',           'Childcare',          false,  10),
    ('general_services','education',           'Education',          false,  20),
    ('general_services','financial_service',   'Financial Services', false,  30),
    ('general_services','insurance',           'Insurance',          false,  40),
    ('general_services','legal',               'Legal & Consulting', false,  50),
    ('general_services','office_supplies',     'Office Supplies',    false,  60),
    ('general_services','pets',                'Pets',               false,  70),
    ('general_services','shipping',            'Shipping',           false,  80),
    ('general_services','storage',             'Storage',            false,  90),
    ('general_services','other_services',      'Other Services',     false, 100),
    ('bank_fees',       'atm',                 'ATM Fee',            false,  10),
    ('bank_fees',       'foreign_transaction', 'Foreign Transaction',false,  20),
    ('bank_fees',       'insufficient',        'Insufficient Funds', false,  30),
    ('bank_fees',       'interest',            'Interest Charge',    false,  40),
    ('bank_fees',       'overdraft',           'Overdraft',          false,  50),
    ('bank_fees',       'other_bank_fees',     'Other Bank Fees',    false,  60),
    ('loan_payments',   'mortgage_payment',    'Mortgage',           false,  10),
    ('loan_payments',   'car_payment',         'Car Payment',        true,   20),
    ('loan_payments',   'credit_card_payment', 'Credit Card Payment',true,   30),
    ('loan_payments',   'student_loan',        'Student Loan',       true,   40),
    ('loan_payments',   'other_loan',          'Other Loan',         true,   50),
    ('government_and_non_profit','taxes',          'Taxes',          false,  10),
    ('government_and_non_profit','donations',      'Donations',      false,  20),
    ('government_and_non_profit','government_fee', 'Government Fee', false,  30),
    ('government_and_non_profit','other_government','Other Government',false, 40),
    ('transfers',       'deposit',             'Deposit',            true,   10),
    ('transfers',       'withdrawal',          'Withdrawal',         true,   20),
    ('transfers',       'account_transfer',    'Account Transfer',   true,   30),
    ('transfers',       'savings_transfer',    'Savings Transfer',   true,   40),
    ('transfers',       'investment_transfer', 'Investment Transfer',true,   50),
    ('transfers',       'cash_advance',        'Cash Advance',       true,   60),
    ('transfers',       'other_transfer',      'Other Transfer',     true,   70),
    ('income',          'paycheck',            'Paycheck',           false,  10),
    ('income',          'bonus',               'Bonus',              false,  20),
    ('income',          'freelance',           'Freelance',          false,  30),
    ('income',          'cashback',            'Cashback',           false,  40),
    ('income',          'tax_returns',         'Tax Refund',         false,  50),
    ('income',          'unemployment',        'Unemployment',       false,  60),
    ('income',          'pension',             'Pension',            false,  70),
    ('income',          'gift_received',       'Gift Received',      false,  80),
    ('income',          'dividend',            'Dividend',           true,   90),
    ('income',          'interest_received',   'Interest Received',  true,  100),
    ('income',          'other_income',        'Other Income',       false, 110),
    ('other',           'uncategorized',       'Uncategorized',      false,  10)
)
INSERT INTO category (user_id, group_id, system_key, name, icon_key, exclude_from_insights, "order")
SELECT
  ig.user_id,
  ig.id,
  sc.system_key,
  sc.name,
  sc.system_key,
  sc.exclude_from_insights,
  sc.ord
FROM inserted_groups ig
JOIN seed_cats sc ON sc.group_key = ig.system_key
  `);
}
