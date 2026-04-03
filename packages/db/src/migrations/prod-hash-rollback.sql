-- Rollback: restore original prod hashes if needed
-- These are the OLD hashes that were in prod before we updated them
UPDATE drizzle.__drizzle_migrations SET hash = 'e405ee2f7478130a41ee05a1b225c3b3eb09a728cb3a781ffc41685e9fef4206' WHERE id = 68;
UPDATE drizzle.__drizzle_migrations SET hash = '228f0d271f4e7b224bdaa7a94f686f05deb70409e0f6265aa99ec183436807f8' WHERE id = 69;
UPDATE drizzle.__drizzle_migrations SET hash = '66782be69e053b3989b263d40877ad41007b1fd452ee5799ca8090d9f6d67951' WHERE id = 70;
UPDATE drizzle.__drizzle_migrations SET hash = '52e928b97b8bbeb9d40f5d4b25a5c856a66e2f8797fc06ef4be3d1e4aacd9b72' WHERE id = 71;
UPDATE drizzle.__drizzle_migrations SET hash = 'b05d11da1458d24f39d0a2c4a4afee72bacef54894d8808f521d3a39d55eb733' WHERE id = 72;
UPDATE drizzle.__drizzle_migrations SET hash = '179f4fc3accb3b3fe228632462076903427c075a2b9d09d5995e276fa901cdb1' WHERE id = 73;
UPDATE drizzle.__drizzle_migrations SET hash = '03cffa9e208c8bd82d10791ed29093f7ad457054d775e1d15d32231706a578b1' WHERE id = 74;
UPDATE drizzle.__drizzle_migrations SET hash = '1a2bc59557b6fccf58dcf54992009b682795ad3c4f23b6b8aa48b5b188973965' WHERE id = 75;
UPDATE drizzle.__drizzle_migrations SET hash = '4c429896bfea115b00e59a5396a1073e41d5be53524ab716d9aa261957459f90' WHERE id = 76;
