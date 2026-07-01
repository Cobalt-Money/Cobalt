/** Demo seed volume + determinism knobs. Tune here, not in generators. */
export const DEMO_TXN_COUNT = 10_000;
export const DEMO_CHAT_THREAD_COUNT = 100;
export const DEMO_MESSAGES_PER_CHAT = 50;
export const DEMO_INSERT_BATCH_SIZE = 2500;
export const DEMO_TXN_HISTORY_DAYS = 3650;
export const DEMO_SEED = 42_026;

/** Fraction of generated txns that receive a user note or extra tag. */
export const DEMO_TXN_NOTE_CHANCE = 0.12;
export const DEMO_TXN_EXTRA_TAG_CHANCE = 0.38;
export const DEMO_TXN_MERCHANT_TAG_CHANCE = 0.62;
/** Untagged txns that pick up a generic tag so the filter UI has coverage. */
export const DEMO_TXN_FALLBACK_TAG_CHANCE = 0.2;

/** Weekly balance snapshots aligned with {@link DEMO_TXN_HISTORY_DAYS}. */
export const DEMO_SNAPSHOT_HISTORY_DAYS = DEMO_TXN_HISTORY_DAYS;
export const DEMO_SNAPSHOT_STEP_DAYS = 7;
