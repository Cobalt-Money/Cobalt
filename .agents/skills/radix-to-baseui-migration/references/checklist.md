# Migration Checklist (shadcn + Base UI)

Run this checklist in order.

## Pass 0: Baseline

1. Ensure tests, type-check, and build pass before migration.
2. Capture baseline screenshots for high-risk UI: dialogs, dropdowns, popovers, tooltips.
3. Note existing accessibility issues separately; do not mix with migration work.

## Pass 1: Dependencies and imports

1. Remove Radix primitive dependencies.
2. Install Base UI dependencies for shadcn Base UI usage.
3. Replace imports in one component family.
4. Run type-check after each family.

## Pass 2: Composition parity

1. Replace `asChild` patterns with render composition.
2. Confirm trigger element remains the intended semantic element.
3. Verify no nested button/anchor interactions are introduced.
4. Verify pointer, keyboard, and focus behavior.

## Pass 3: Types and renamed APIs

1. Fix all TypeScript errors for the active family.
2. Update renamed props and primitive part names.
3. Remove legacy helper types tied to Radix import paths.
4. Re-run type-check and build.

## Pass 4: Positioning

1. Introduce Positioner for components that require floating placement.
2. Move side/align/offset/collision props to the correct layer.
3. Validate viewport collision behavior and alignment.
4. Validate open/close animation anchors after position changes.

## Pass 5: Validation

1. Search source for leftover Radix import paths.
2. Run test suite and build.
3. Execute manual keyboard flow checks:
   - Open/close with keyboard
   - Focus trap and return focus
   - Escape behavior
4. Compare screenshots to baseline for layout regressions.

## Definition of done

1. No Radix primitive packages in dependency manifest.
2. No Radix primitive imports in source.
3. No migration-related TS/build errors.
4. Floating components render and position correctly.
5. Interaction parity preserved.
