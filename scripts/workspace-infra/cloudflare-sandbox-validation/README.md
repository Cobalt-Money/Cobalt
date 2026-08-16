# Cloudflare Sandbox validation

Disposable Worker and smoke harness for SRI-359. It validates the Cloudflare
Sandbox SDK without depending on the future Cobalt workspace Worker or R2.

## Run

Prerequisites: Cloudflare Workers Paid access, `wrangler login`, Docker, Node,
Bun, and `jq`.

```sh
npm run deploy:smoke
```

The command generates a bearer token in process memory, deploys the Worker,
sets the token as a Wrangler secret, and tests Bash, command exit behavior,
Python, PyPDF, client-visible streaming, idle sleep/wake, and explicit destroy.
It never writes the token to the repository or prints it.

Remove the disposable Worker and its container application afterward:

```sh
npm run teardown
```

R2 mounts, prefix isolation, read-only uploads, and durable outputs are
intentionally deferred.
