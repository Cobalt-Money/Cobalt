# packages/config

Shared base TypeScript configuration for the monorepo.

## File Structure

```
tsconfig.base.json    — Base tsconfig extended by all other packages and apps
package.json
```

## Conventions

- This package only contains shared config — no runtime code
- All other `tsconfig.json` files in the monorepo extend `tsconfig.base.json` from here
