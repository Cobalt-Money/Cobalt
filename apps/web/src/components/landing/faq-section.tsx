import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@cobalt-web/ui/components/accordion";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const FAQS: { a: ReactNode; q: string }[] = [
  {
    a: "We use third party services, Plaid and SnapTrade, to link financial institutions. You can also add accounts and transactions manually.",
    q: "How does Cobalt connect to my accounts?",
  },
  {
    a: (
      <div className="flex flex-col gap-3">
        <p>
          Cobalt stores all of the financial data that you either enter manually or connect through
          a financial institution. See{" "}
          <Link
            className="font-medium text-foreground hover:opacity-80"
            style={{ textDecoration: "none" }}
            to="/privacy"
          >
            our privacy policy
          </Link>{" "}
          and the third-party documentation from{" "}
          <a
            className="font-medium text-foreground hover:opacity-80"
            href="https://plaid.com/safety/"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
            target="_blank"
          >
            Plaid
          </a>{" "}
          and{" "}
          <a
            className="font-medium text-foreground hover:opacity-80"
            href="https://snaptrade.com/security"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
            target="_blank"
          >
            SnapTrade
          </a>{" "}
          for the full picture of what's collected.
        </p>
        <p>
          We exercise{" "}
          <a
            className="font-medium text-foreground hover:opacity-80"
            href="https://vercel.com/blog/zdr-on-ai-gateway"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
            target="_blank"
          >
            zero data retention
          </a>{" "}
          with our AI providers when you use AI features inside Cobalt, so none of your data is used
          for training.
        </p>
        <p>
          If you use Cobalt from your own third-party apps via our API, only the data scoped to the
          OAuth grant you approved is shared, and you can revoke access at any time from your Cobalt
          settings.
        </p>
      </div>
    ),
    q: "Is this secure?",
  },
  {
    a: "Any client that supports Dynamic Client Registration (RFC 7591) over MCP. Direct token-based API access coming soon.",
    q: "Which AI assistants work with Cobalt?",
  },
  {
    a: "Yes, native iOS app on the App Store.",
    q: "Do you have a mobile app?",
  },
  {
    a: (
      <>
        Free tier covers core accounts and chat. Paid tier unlocks unlimited connections and premium
        AI models. See the{" "}
        <Link
          className="font-medium text-foreground hover:opacity-80"
          style={{ textDecoration: "none" }}
          to="/pricing"
        >
          pricing
        </Link>{" "}
        page for details.
      </>
    ),
    q: "How much does Cobalt cost?",
  },
  {
    a: (
      <>
        Yes. Cobalt is open source under AGPL-3.0, so you can clone the repo and run your own
        instance. Self-hosting is not officially supported (no managed onboarding, migrations, or
        SLAs), but the code, schema, and deployment configs are all public on{" "}
        <a
          className="font-medium text-foreground hover:opacity-80"
          href="https://github.com/Sriketk/cobalt-v2"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
          target="_blank"
        >
          GitHub
        </a>
        .
      </>
    ),
    q: "Can I self-host Cobalt?",
  },
];

export function FaqSection() {
  return (
    <section className="border-t px-6 py-24 lg:py-32" id="faq">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl md:text-6xl">FAQ</h2>
        </div>
        <Accordion className="w-full rounded-none border-0">
          {FAQS.map((item, i) => (
            <AccordionItem className="data-open:bg-transparent" key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium sm:text-lg">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
