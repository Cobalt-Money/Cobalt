# Mobile freemium gating — implementation spec

Hand this entire file to Claude in the mobile repo. Self-contained — covers API contract, UI states, copy, behavior, edge cases. Implements SRI-335 parity with web.

## Goal

Bring the same free-tier gating UX from Cobalt-Web to mobile. Free users see:
1. **Pre-emptive disable** when trying to add a 3rd connected account.
2. **Frozen badge** on connection cards that exceed cap.
3. **Top banner** when free-tier cap reached, subscription past-due, or cancellation scheduled.

Manual accounts are **never** gated — only Plaid + SnapTrade.

---

## API contract

Single endpoint provides everything: `GET /api/internal/subscriptions`

Response shape (zod schema in `packages/server-data/src/subscriptions/schemas.ts`):

```ts
{
  hasActiveSubscription: boolean;
  subscriptionSource: "stripe" | "appstore" | null;
  tier: "free" | "pro";
  status: string | null;            // "active" | "past_due" | "trialing" | "canceled" | ...
  periodEnd: string | null;         // ISO 8601
  cancelAtPeriodEnd: boolean;
  connectionStates: Array<{
    id: string;                     // internal DB id
    externalId: string;             // plaidItemId or snaptrade authorizationId — match against connection cards
    kind: "plaid" | "snaptrade";
    frozen: boolean;                // true = sync paused, free-tier cap exceeded
  }>;
}
```

**Cache**: `private, no-store`. Refetch on app foreground + after upgrade/downgrade webhooks.

**Auth**: requires session (Better Auth). Same auth flow already used elsewhere.

**Fallback**: if 4xx/5xx, treat as `{tier: "free", connectionStates: [], hasActiveSubscription: false, ...defaults}`. Never block UI on this call.

---

## Tier rules (from server)

- **Free**: 2 connections (Plaid + SnapTrade pooled), Haiku model only, no extended thinking.
- **Pro**: unlimited connections, Haiku + Opus, extended thinking enabled.
- **Manual accounts**: uncapped at all tiers.

Server enforces:
- New connection blocked at API → `402 {code: "connection_limit_reached"}` for Plaid link token + SnapTrade portal generation.
- Webhook sync skipped for over-cap connections (server marks them `frozen: true`).

Mobile must surface this state — don't enforce, just reflect.

---

## UI components needed

### 1. `SubscriptionBanner` (top-of-screen strip)

Fixed strip at top of main app shell. Mirrors web's `SubscriptionStateBanner`.

**Priority** (only one variant at a time, this order):
1. `past_due` → tier === "pro" && status === "past_due"
2. `cancel_scheduled` → cancelAtPeriodEnd === true
3. `free_cap_exceeded` → tier === "free" && connectionStates.any { $0.frozen }
4. Otherwise: hide.

**Variants**:

| Variant | Icon | Title | Body | CTA |
|---|---|---|---|---|
| past_due | credit-card (red) | "Payment past due" | "We'll keep syncing during the grace period — update billing to avoid losing access." | "Update billing" → opens Stripe billing portal |
| cancel_scheduled | clock | "Cancellation scheduled" | "Subscription ends {periodEnd, formatted "5 Mar"} — connections past the free cap will pause then." | "Reactivate" → opens Stripe billing portal |
| free_cap_exceeded | alert-circle | "Free-tier cap reached" | "{frozenCount} connection{s} paused — upgrade or disconnect to free a slot." | "Upgrade" → opens upgrade sheet |

**Visual**: 36pt height, system background, bottom border (1pt), centered horizontal layout: icon · title (semibold) · separator · body · CTA right-aligned.

**Don't show in demo mode** (anonymous session). Web does `isDemo ? <DemoBanner /> : <BillingBanner />` — mobile likely already has demo banner; gate same way.

**Sidebar/content shift**: web adds `data-billing-banner="1"` on shell wrapper + CSS top offset. Mobile = adjust `safeAreaInset.top` or push main `ScrollView` content down by banner height when active.

### 2. Frozen badge on connection card

For each connected account card, look up its connection state by `externalId`:
- Plaid card: match `plaidItemId` → find `connectionStates` entry where `kind == "plaid"` && `externalId == plaidItemId`.
- SnapTrade card: match `authorizationId` → find entry where `kind == "snaptrade"`.

If `frozen == true`:
- Apply `opacity: 0.6` + grayscale to entire card.
- Add "Frozen" pill badge next to account type label. Amber/warning color. Tap → toast or sheet: "Sync paused — upgrade to reactivate."

Manual accounts have no connection state → never frozen.

### 3. Pre-emptive disable on Add account flow

After user selects an institution in the institution picker:
- If `tier == "free"` && `connectionStates.count >= 2`:
  - Show institution choice screen with **Link via Plaid/SnapTrade** option disabled.
  - Card shows: title + "Free tier limit reached." + "Upgrade to Pro" pill button (right side, primary color).
  - Tap button → open upgrade sheet.
  - **Add manually** option stays enabled.
- Else: normal flow.

Defense-in-depth: server still returns 402 on cap. Catch + present upgrade sheet on that path too.

### 4. Upgrade sheet

Triggered by:
- Tapping Upgrade CTA on banner.
- Tapping Upgrade button on disabled Link card.
- 402 response from any gated endpoint with `code: "connection_limit_reached"`.

Sheet content (parity with web `UpgradePromptHost`):
- Title varies by reason:
  - `connection_limit_reached` → "Connect more accounts with Pro"
  - `model_not_allowed` → "Upgrade for advanced AI models"
  - `extended_thinking_not_allowed` → "Upgrade for extended thinking"
- Two plan options:
  - **Pro · monthly** — $6.99 / month · cancel anytime
  - **Pro · annual** — $70 / year · save 16%
- On iOS: use **StoreKit / App Store IAP** (App Store subscription), NOT Stripe Checkout. Apple requires this for in-app purchases of digital subscriptions.
- After successful purchase: call `POST /api/internal/appstore/sync` with `{environment, expiresAt, latestTransactionId, originalTransactionId, productId}` so server's `mobile_subscription` row updates. Invalidate subscription query → banner disappears.

---

## Behavior details

### Demo bypass
Demo (anonymous) users bypass subscription gating per server middleware. Mobile should also skip banner + disable logic when `user.isAnonymous == true`.

### Refetch triggers
- App foreground.
- After Add account flow completes (regardless of success).
- After upgrade purchase succeeds.
- On every app launch.

### Race conditions
User could be at cap in one tab/device, then disconnect a connection elsewhere. Always re-fetch subscription state right before showing the Add flow, not just on cold launch.

### What NOT to do
- Don't hide the cap-reached banner just because user dismissed it. Banner reflects state, not notification. Re-renders on every fetch.
- Don't compute cap status locally from account count — server's `connectionStates` is source of truth (handles disabled rows, pending disconnects, etc.).
- Don't gate manual accounts.
- Don't show banner during onboarding flow (first connection).

---

## Server-side knobs (already in place — don't change)

- `FREE_LIMITS.connections = 2` (`packages/server-data/src/subscriptions/limits.ts`)
- `PRO_LIMITS.connections = Number.POSITIVE_INFINITY`
- Stripe entitled statuses: `["active", "past_due", "trialing"]` — past_due grants grace period.
- Plaid webhook: skips sync workflow when over cap, acks 200.
- SnapTrade webhook: skips data-sync events, allows lifecycle events.

If mobile needs additional capabilities (e.g. iOS-only feature flag), add to `CAPABILITIES` registry in `packages/server-data/src/subscriptions/can.ts`. Currently registered:
- `connection:add` (context: `{current: number}`)
- `model:opus`
- `thinking:extended`

Call from server: `await can(userId, "capability", ctx?)`. Add new ones for mobile-specific gates as needed.

---

## Visual reference (web)

- Top banner: 36pt fixed, system background, border-b, icon + lead · body + CTA (pill button right).
- Frozen card: `opacity-60 grayscale` + amber "Frozen" pill in card header.
- Disabled Link option: card with title + "Free tier limit reached." subtitle + "Upgrade to Pro" pill button (right side, primary fill).
- Upgrade sheet: vertical stack, title + 2 plan cards (border, hover-fill), annual highlighted with primary border.

---

## Acceptance checklist

- [ ] `GET /api/internal/subscriptions` called on app launch + foreground; state cached in store.
- [ ] Banner renders correctly for all 3 variants; hides when neutral state.
- [ ] Banner respects demo bypass.
- [ ] Frozen badge appears on correct cards (match by externalId).
- [ ] Frozen card has dimmed appearance.
- [ ] Add Account flow disables Link option pre-emptively when over cap (free tier).
- [ ] Manual account add never disabled.
- [ ] Upgrade sheet opens from banner CTA, disabled Link button, and 402 response.
- [ ] iOS uses StoreKit (App Store IAP), not Stripe Checkout.
- [ ] Successful purchase syncs to server `/api/internal/appstore/sync`.
- [ ] Subscription state refetches after purchase; banner disappears.
- [ ] Past-due banner CTA opens Stripe billing portal (or App Store subscription management on iOS).
- [ ] Cancel-scheduled banner CTA opens billing portal for reactivation.

---

## Reference files (web, for parity)

- API: `apps/server/src/api/internal/subscriptions/status.ts`
- Schema: `packages/server-data/src/subscriptions/schemas.ts`
- Hook: `apps/web/src/hooks/use-subscription-status.ts`
- Banner: `packages/ui/src/cobalt/subscription/subscription-state-banner.tsx`
- Banner wrapper: `apps/web/src/components/billing/billing-banner.tsx`
- Frozen card prop: `packages/ui/src/cobalt/accounts/account-card.tsx`
- Disabled Link: `apps/web/src/components/shell/command-menu/pages/link-or-manual.tsx`
- Upgrade modal: `apps/web/src/components/upgrade/upgrade-prompt-host.tsx`
- Server gates: `apps/server/src/api/internal/plaid/link.ts:158`, `apps/server/src/api/internal/snaptrade/generate-connection-portal.ts:46`
- Webhook freeze: `apps/server/src/webhooks/plaid.ts`, `apps/server/src/webhooks/snaptrade.ts`
- App Store sync: `apps/server/src/api/internal/appstore.ts`

Cross-reference these when copy/visual ambiguity arises.
