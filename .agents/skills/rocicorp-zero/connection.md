# Connection status and reconnection

The **sync connection** is the live link between each **Zero client** and **`zero-cache`**. It is separate from a one-off **REST** call: it carries **subscriptions**, **heartbeats**, and **mutation** traffic.

## States you should surface

Expose enough state in the UI or logs to answer:

- **Online / syncing** — normal.
- **Reconnecting** — transient network or server restart.
- **Error** — auth failure, incompatible schema version, server bug, or `zero-cache` down.

Developers waste hours when connection state is invisible.

## Auth transitions

When users **log in**, **refresh tokens**, or **log out**:

- Subscriptions from the **previous** principal must **tear down**.
- New subscriptions must use the **new** auth context on the **query resolver**.

Zero documents cases where the client must **reconnect manually** after **auth errors** rather than assuming automatic recovery. Plan explicit calls in your auth layer: after successful refresh, after logout, after account switch.

## Clock skew and token expiry

JWT expiry and server clock drift manifest as **sudden sync death**. If errors spike at predictable intervals, verify:

- Server time sync (NTP).
- Token TTL vs refresh strategy.
- That **query** and **mutate** handlers read the same session store.

## Relationship to HTTP load balancers

If `zero-cache` or sync uses **long-lived** connections, ensure proxies set **appropriate timeouts** and enable **WebSocket or streaming** modes if applicable to your Zero transport. Misconfigured idle timeouts look like “random disconnects.”

## Related chapters

- [authentication.md](authentication.md) — identity on the server
- [faq.md](faq.md) — “stuck after login”
- [debugging.md](debugging.md) — deeper traces

## Package reference

**`out/zero-client/src/client/connection*.ts`** — sync connection lifecycle and status types (exact filenames vary by version; list that directory).

## Further reading (official)

- [Connection status](https://zero.rocicorp.dev/docs/connection)
