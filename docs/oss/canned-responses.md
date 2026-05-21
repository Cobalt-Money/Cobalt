# Canned issue responses

Copy/paste replies for predictable issues. Saves typing and keeps tone
consistent. Close as `not planned` after replying unless otherwise noted.

## Self-hosting setup question

> Thanks for trying Cobalt out.
>
> Self-hosting is not officially supported — see the
> [README](../../README.md) and [FAQ](./FAQ.md) for the rationale. The
> hosted Cobalt product is the canonical way to use it. We will not be
> writing setup tutorials, providing one-command deploy paths, or
> triaging deployment issues.
>
> Closing as not planned. The code remains public for transparency and
> audit purposes.

## "Can you add license X / dual-license / change to MIT"

> The license decision (AGPL-3.0) is intentional and not under review.
> See the [FAQ](./FAQ.md) for the rationale. Commercial licensing is
> available — contact licensing@cobalt.app.
>
> Closing as not planned.

## External PR without DCO sign-off

> Thanks for the PR. Before we can merge, every commit needs a
> `Signed-off-by:` trailer per the project's
> [DCO requirement](../../RELICENSING.md).
>
> To fix: `git rebase --signoff main && git push -f` on your branch.
> Going forward, commit with `git commit -s` to sign off automatically.
>
> Once the DCO check turns green, we will pick this up.

## Bug report on self-hosted deployment

> Thanks for the report. Self-hosted deployments are unsupported, so
> we will label this as `unsupported` and may not prioritize it. PRs
> from the community to fix self-host-specific issues are welcome,
> assuming they don't add setup documentation or seed data.

## Security issue posted publicly

> This looks like a potential security issue. Please **do not** post
> security findings publicly. Email **sriketk@try-cobalt.com** with the
> details — see [`SECURITY.md`](../../SECURITY.md) for the disclosure
> process.
>
> Locking and hiding this issue. Will follow up via email if you have
> already provided contact information.
