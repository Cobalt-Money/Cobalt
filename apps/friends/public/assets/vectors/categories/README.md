# Category icons

System category SVGs. One file per `category.systemKey`, foldered by `category_group.systemKey`.

## Layout

```
categories/
  {group_system_key}/
    {category_system_key}.svg
```

Examples:

```
categories/food_drink/groceries.svg
categories/food_drink/dining_out.svg
categories/transport/gas_fuel.svg
categories/income/paycheck.svg
categories/other/uncategorized.svg
```

## Naming

- Filename = exact `category.systemKey` (snake_case, lowercase)
- Folder = exact `category_group.systemKey`
- One SVG per category — variants live inside the file (currentColor + dark mode classes)

## Conventions

- Stroke 2px, 24×24 viewBox, `currentColor` strokes for theme inheritance
- No size baked into filename (CSS handles sizing)
- Optional dark variant: `{system_key}.dark.svg` sibling

## Registry

Static index of every SVG lives in
`packages/ui/src/cobalt/transactions/categories/category-system-icons.ts`
keyed by `systemKey`. Adding a new icon = drop SVG here + add entry there.

## Legacy icons

Files in the parent `vectors/` directory (e.g. `cheese.svg`, `building.svg`)
back the legacy Plaid-PFC-keyed `PRIMARY_CATEGORY_ICON` map and stay until
phase 5 cleanup of legacy `transaction.category{,Detail,Confidence}` columns.
