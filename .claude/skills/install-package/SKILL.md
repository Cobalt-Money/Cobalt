---
name: install-package
description: Install an npm package, add it to the correct AGENTS.md, and find/install an agent skill for it
disable-model-invocation: true
argument-hint: <package-name>
---

# Install Package

Install `$ARGUMENTS` and fully integrate it into the project.

## Steps

### 1. Install the package

```bash
bun add $ARGUMENTS
```

If it's a dev dependency (linter, build tool, type package, etc.), use `bun add -d $ARGUMENTS` instead.

### 2. Determine which project uses it

Figure out where this package will be used based on what it does:

- **apps/web** — Frontend libraries (React components, routing, state, UI)
- **apps/server** — Backend libraries (HTTP, middleware, API utilities)
- **apps/fumadocs** — Documentation libraries (MDX, content processing)
- **packages/db** — Database libraries (ORM, drivers, migration tools)
- **packages/auth** — Auth libraries (session, OAuth, tokens)
- **packages/ui** — UI primitives (headless components, styling utilities)
- **packages/zero** — Real-time sync libraries
- **packages/env** — Environment/config validation libraries

If the package is general-purpose (used across multiple projects), add it to the root `AGENTS.md` only.

### 3. Update AGENTS.md

Add the package to the **Package References** section of the correct AGENTS.md file(s). Use the exact npm package name and point to its source path in node_modules:

```
- **package-name:** `node_modules/package-name/dist/` — brief description of what it provides
```

Look at the existing entries in that file to match the format.

Also add it to the root `AGENTS.md` Package Documentation table if it's a significant dependency.

### 4. Find and install an agent skill

Search for a pre-built agent skill for this package:

```bash
npx skills find $ARGUMENTS
```

Also check if TanStack Intent has a skill for it:

```bash
npx @tanstack/intent list
```

If a quality skill is found (1K+ installs, reputable source):

1. Install it with `npx skills add <owner/repo@skill> -y`
2. Add it to the **Skills** section in the correct AGENTS.md file(s)
3. Add it to the root `AGENTS.md` skills table

If no skill is found, that's fine — the package reference in AGENTS.md is still valuable.

### 5. Verify

Run `bun check` to make sure nothing is broken.
