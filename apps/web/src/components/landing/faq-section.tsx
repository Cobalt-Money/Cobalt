import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@cobalt-web/ui/components/accordion";

const FAQS = [
  {
    a: "We use Plaid to securely link banks, cards, brokerages, and crypto. Cobalt never sees your bank credentials — Plaid handles authentication directly with your institution.",
    q: "How does Cobalt connect to my accounts?",
  },
  {
    a: "Yes. Cobalt is open source under AGPL-3.0 — you can audit exactly what happens to your data. We never sell it, and AI requests run through providers we explicitly disclose.",
    q: "Is my financial data private?",
  },
  {
    a: "ChatGPT, Claude, Raycast, n8n, Cursor, and anything that speaks MCP. You can also hit the public REST API directly.",
    q: "Which AI assistants work with Cobalt?",
  },
  {
    a: "Yes — native iOS app on the App Store, fully in sync with the web app.",
    q: "Do you have a mobile app?",
  },
  {
    a: "Free tier covers core accounts and chat. Paid tier unlocks unlimited connections and premium AI models. See the pricing page for details.",
    q: "How much does Cobalt cost?",
  },
  {
    a: "Source is open under AGPL-3.0 so you can inspect and run it, but self-hosting is not officially supported. The hosted product is the recommended path.",
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
