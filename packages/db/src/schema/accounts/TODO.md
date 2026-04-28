# Banking / transactions schema

- [ ] Add **effective** name and category columns (denormalized) so filters and AI queries don’t merge JSON at read time.
- [ ] Remove or stop relying on **deprecated** Plaid fields (e.g. legacy `category`); migrate/sanitize stored rows as needed.
