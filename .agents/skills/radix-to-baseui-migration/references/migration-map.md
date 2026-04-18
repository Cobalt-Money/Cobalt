# Migration Map (Radix -> Base UI for shadcn usage)

Use this as a pattern guide, then confirm exact API names in current Base UI docs.

## A) Import migration pattern

1. Replace Radix primitive package imports with Base UI package imports.
2. Preserve local wrapper component names to avoid broad JSX churn.
3. Convert aliases only when needed to avoid naming conflicts.

## B) `asChild` -> render pattern

Radix pattern (concept):

```tsx
<Trigger asChild>
  <Button>Open</Button>
</Trigger>
```

Base UI pattern (concept):

```tsx
<Trigger render={<Button>Open</Button>} />
```

Migration notes:

1. Ensure event handlers and refs are forwarded correctly through render composition.
2. Keep trigger semantics intact (button stays button, link stays link).
3. Re-check disabled state behavior after conversion.

## C) Type migration pattern

1. Replace component prop types sourced from Radix paths with Base UI primitive prop types.
2. Expect part-name changes (for example, overlay/backdrop/content naming differences).
3. Remove local utility types that only existed to adapt Radix types.
4. Prefer directly importing primitive prop types from Base UI where possible.

## D) Common rename classes

Expect these classes of changes:

1. Primitive part renames (trigger/content/overlay/backdrop variants).
2. Event prop renames (open-change and related callbacks).
3. Positioning prop location changes (moved to Positioner or equivalent layer).
4. Slot/composition differences in wrapper component APIs.

## E) Positioning migration pattern

Before (concept):

```tsx
<Content side="bottom" align="start" />
```

After (concept):

```tsx
<Positioner side="bottom" align="start">
  <Content />
</Positioner>
```

Migration notes:

1. Move all placement concerns to the positioning layer.
2. Keep content component focused on structure/styling.
3. Verify collision and offset behavior in narrow viewports.

## F) Error-driven execution strategy

1. Compile early and often.
2. Treat every TS error as a mapping task:
   - import path mismatch
   - renamed prop/type
   - composition mismatch
   - positioning layer mismatch
3. Resolve shared wrapper components first, leaf usage second.

## G) shadcn-specific guidance

1. Use shadcn Base UI examples as reference implementation patterns.
2. Prioritize parity with generated shadcn component shape before custom abstractions.
3. Keep class names and style tokens unchanged during migration to isolate behavior changes.
