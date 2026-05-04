-- SRI-311 phase 1 cleanup: backfill `transaction.category_id` + `recurring.category_id`
-- from legacy Plaid PFC `category_detail` text, then drop the legacy columns.
--
-- Backfill must happen BEFORE the DROP COLUMN — once `category_detail` is gone,
-- the PFC mapping is impossible to recover. Falls back to `uncategorized` for
-- unmapped/null PFC.
--
-- Source of truth for PFC → systemKey: packages/server-data/src/transactions/categories/map.ts

CREATE TEMP TABLE _pfc_map (
	pfc_detailed text PRIMARY KEY,
	system_key text NOT NULL
) ON COMMIT DROP;
--> statement-breakpoint

INSERT INTO _pfc_map (pfc_detailed, system_key) VALUES
	('BANK_FEES_ATM_FEES',                                              'atm'),
	('BANK_FEES_FOREIGN_TRANSACTION_FEES',                              'foreign_transaction'),
	('BANK_FEES_INSUFFICIENT_FUNDS',                                    'insufficient'),
	('BANK_FEES_INTEREST_CHARGE',                                       'interest'),
	('BANK_FEES_OTHER_BANK_FEES',                                       'uncategorized'),
	('BANK_FEES_OVERDRAFT_FEES',                                        'overdraft'),
	('ENTERTAINMENT_CASINOS_AND_GAMBLING',                              'gambling'),
	('ENTERTAINMENT_MUSIC_AND_AUDIO',                                   'music'),
	('ENTERTAINMENT_MUSIC_AND_VIDEO_STREAMING',                         'streaming'),
	('ENTERTAINMENT_OTHER_ENTERTAINMENT',                               'uncategorized'),
	('ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS',       'event'),
	('ENTERTAINMENT_TV_AND_MOVIES',                                     'movies'),
	('ENTERTAINMENT_VIDEO_GAMES',                                       'video_games'),
	('FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR',                             'alcohol_bars'),
	('FOOD_AND_DRINK_COFFEE',                                           'coffee_shop'),
	('FOOD_AND_DRINK_FAST_FOOD',                                        'restaurants'),
	('FOOD_AND_DRINK_GROCERIES',                                        'groceries'),
	('FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK',                             'snacks'),
	('FOOD_AND_DRINK_RESTAURANT',                                       'restaurants'),
	('FOOD_AND_DRINK_VENDING_MACHINES',                                 'snacks'),
	('GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS',                   'books_media'),
	('GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES',                    'clothing'),
	('GENERAL_MERCHANDISE_CONVENIENCE_STORES',                          'convenience_store'),
	('GENERAL_MERCHANDISE_DEPARTMENT_STORES',                           'shopping'),
	('GENERAL_MERCHANDISE_DISCOUNT_STORES',                             'shopping'),
	('GENERAL_MERCHANDISE_ELECTRONICS',                                 'electronics'),
	('GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES',                         'gift'),
	('GENERAL_MERCHANDISE_OFFICE_SUPPLIES',                             'office_supplies'),
	('GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',                         'shopping'),
	('GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE',                   'shopping'),
	('GENERAL_MERCHANDISE_PET_SUPPLIES',                                'pets'),
	('GENERAL_MERCHANDISE_SPORTING_GOODS',                              'sporting_goods'),
	('GENERAL_MERCHANDISE_SUPERSTORES',                                 'shopping'),
	('GENERAL_MERCHANDISE_TOBACCO_AND_VAPE',                            'vape'),
	('GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING',              'financial_service'),
	('GENERAL_SERVICES_AUTOMOTIVE',                                     'auto_maintenance'),
	('GENERAL_SERVICES_CHILDCARE',                                      'childcare'),
	('GENERAL_SERVICES_CONSULTING_AND_LEGAL',                           'legal'),
	('GENERAL_SERVICES_EDUCATION',                                      'education'),
	('GENERAL_SERVICES_INSURANCE',                                      'insurance'),
	('GENERAL_SERVICES_OTHER_GENERAL_SERVICES',                         'uncategorized'),
	('GENERAL_SERVICES_POSTAGE_AND_SHIPPING',                           'shipping'),
	('GENERAL_SERVICES_STORAGE',                                        'storage'),
	('GOVERNMENT_AND_NON_PROFIT_DONATIONS',                             'donations'),
	('GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES',   'government_fee'),
	('GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT',       'uncategorized'),
	('GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT',                           'taxes'),
	('HOME_IMPROVEMENT_FURNITURE',                                      'furniture'),
	('HOME_IMPROVEMENT_HARDWARE',                                       'hardware'),
	('HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT',                         'uncategorized'),
	('HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE',                         'home_maintenance'),
	('HOME_IMPROVEMENT_SECURITY',                                       'security'),
	('INCOME_DIVIDENDS',                                                'dividend'),
	('INCOME_INTEREST_EARNED',                                          'interest_received'),
	('INCOME_OTHER_INCOME',                                             'uncategorized'),
	('INCOME_PAYROLL',                                                  'paycheck'),
	('INCOME_RETIREMENT_PENSION',                                       'pension'),
	('INCOME_TAX_REFUND',                                               'tax_returns'),
	('INCOME_UNEMPLOYMENT',                                             'unemployment'),
	('INCOME_WAGES',                                                    'paycheck'),
	('LOAN_PAYMENTS_CAR_PAYMENT',                                       'car_payment'),
	('LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',                               'credit_card_payment'),
	('LOAN_PAYMENTS_MORTGAGE_PAYMENT',                                  'mortgage_payment'),
	('LOAN_PAYMENTS_OTHER_PAYMENT',                                     'other_loan'),
	('LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT',                             'other_loan'),
	('LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT',                              'student_loan'),
	('MEDICAL_DENTAL_CARE',                                             'dental'),
	('MEDICAL_EYE_CARE',                                                'eye_doctor'),
	('MEDICAL_NURSING_CARE',                                            'nursing'),
	('MEDICAL_OTHER_MEDICAL',                                           'uncategorized'),
	('MEDICAL_PHARMACIES_AND_SUPPLEMENTS',                              'pharmacy'),
	('MEDICAL_PRIMARY_CARE',                                            'primary'),
	('MEDICAL_VETERINARY_SERVICES',                                     'vet'),
	('PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS',                          'fitness'),
	('PERSONAL_CARE_HAIR_AND_BEAUTY',                                   'hair_beauty'),
	('PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING',                          'laundry'),
	('PERSONAL_CARE_OTHER_PERSONAL_CARE',                               'uncategorized'),
	('RENT_AND_UTILITIES_GAS_AND_ELECTRICITY',                          'energy'),
	('RENT_AND_UTILITIES_INTERNET_AND_CABLE',                           'internet'),
	('RENT_AND_UTILITIES_OTHER_UTILITIES',                              'uncategorized'),
	('RENT_AND_UTILITIES_RENT',                                         'rent_mortgage'),
	('RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT',                  'waste'),
	('RENT_AND_UTILITIES_TELEPHONE',                                    'phone'),
	('RENT_AND_UTILITIES_WATER',                                        'water'),
	('TRANSFER_IN_ACCOUNT_TRANSFER',                                    'account_transfer'),
	('TRANSFER_IN_CASH_ADVANCES_AND_LOANS',                             'cash_advance'),
	('TRANSFER_IN_DEPOSIT',                                             'deposit'),
	('TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS',                     'investment_transfer'),
	('TRANSFER_IN_OTHER_TRANSFER_IN',                                   'uncategorized'),
	('TRANSFER_IN_SAVINGS',                                             'savings_transfer'),
	('TRANSFER_OUT_ACCOUNT_TRANSFER',                                   'account_transfer'),
	('TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS',                    'investment_transfer'),
	('TRANSFER_OUT_OTHER_TRANSFER_OUT',                                 'uncategorized'),
	('TRANSFER_OUT_SAVINGS',                                            'savings_transfer'),
	('TRANSFER_OUT_WITHDRAWAL',                                         'withdrawal'),
	('TRANSPORTATION_BIKES_AND_SCOOTERS',                               'bike_scooter'),
	('TRANSPORTATION_GAS',                                              'gas_fuel'),
	('TRANSPORTATION_OTHER_TRANSPORTATION',                             'uncategorized'),
	('TRANSPORTATION_PARKING',                                          'parking'),
	('TRANSPORTATION_PUBLIC_TRANSIT',                                   'public_transit'),
	('TRANSPORTATION_TAXIS_AND_RIDE_SHARES',                            'taxi'),
	('TRANSPORTATION_TOLLS',                                            'toll'),
	('TRAVEL_FLIGHTS',                                                  'flights'),
	('TRAVEL_LODGING',                                                  'hotels'),
	('TRAVEL_OTHER_TRAVEL',                                             'uncategorized'),
	('TRAVEL_RENTAL_CARS',                                              'rentals');
--> statement-breakpoint

-- Backfill `transaction.category_id` from PFC mapping; fall back to user's `uncategorized`.
UPDATE "transaction" t
SET category_id = c.id, updated_at = now()
FROM category c
WHERE t.user_id = c.user_id
	AND c.deleted_at IS NULL
	AND t.category_id IS NULL
	AND c.system_key = COALESCE(
		(SELECT system_key FROM _pfc_map WHERE pfc_detailed = t.category_detail),
		'uncategorized'
	);
--> statement-breakpoint

-- Backfill `recurring.category_id` same way.
UPDATE "recurring" r
SET category_id = c.id, updated_at = now()
FROM category c
WHERE r.user_id = c.user_id
	AND c.deleted_at IS NULL
	AND r.category_id IS NULL
	AND c.system_key = COALESCE(
		(SELECT system_key FROM _pfc_map WHERE pfc_detailed = r.category_detail),
		'uncategorized'
	);
--> statement-breakpoint

ALTER TABLE "recurring" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "recurring" DROP COLUMN "category_confidence";--> statement-breakpoint
ALTER TABLE "recurring" DROP COLUMN "category_detail";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "category_confidence";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "category_detail";
