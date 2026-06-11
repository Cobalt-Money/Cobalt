import { Dialog, DialogContent, DialogTitle } from "@cobalt-web/ui/components/dialog";
import { usePlaidLinkFlow } from "@cobalt-web/ui/cobalt/accounts/use-plaid-link-flow";
import { useState } from "react";
import { toast } from "sonner";

import { plaidApi, userApi } from "../lib/api-client";

interface ShareAnswers {
  shareAmount: boolean;
  shareCard: boolean;
  shareDate: boolean;
  shareMerchant: boolean;
  shareNote: boolean;
}

const DEFAULT_ANSWERS: ShareAnswers = {
  shareAmount: true,
  shareCard: true,
  shareDate: true,
  shareMerchant: true,
  shareNote: false,
};

interface Slide {
  key: keyof ShareAnswers | "connect" | "intro";
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    body: "Pocketwatch turns your in-store purchases into a private map you share with friends. Answer a few quick questions about what financial info you'd like them to see.",
    key: "intro",
    title: "Welcome to Pocketwatch",
  },
  {
    body: "Friends will see the dollar amount on your in-store purchases.",
    key: "shareAmount",
    title: "Show the amount?",
  },
  {
    body: "Friends will see the merchant name (e.g. Starbucks).",
    key: "shareMerchant",
    title: "Show the merchant?",
  },
  {
    body: "Friends will see which card + bank funded the purchase.",
    key: "shareCard",
    title: "Show card + bank?",
  },
  {
    body: "Friends will see the date of the transaction.",
    key: "shareDate",
    title: "Show the date?",
  },
  {
    body: "Friends will see any note you wrote on the transaction.",
    key: "shareNote",
    title: "Show your note?",
  },
  {
    body: "Connect a bank to populate your map. Only in-store purchases with location are shared.",
    key: "connect",
    title: "Connect a bank",
  },
];

interface OnboardingModalProps {
  open: boolean;
  /** Called when the user actually finishes onboarding (submit or skip-through). */
  onComplete: () => void;
  /** Called on backdrop / Escape dismiss — does NOT mark onboarding complete. */
  onDismiss: () => void;
}

export function OnboardingModal({ open, onComplete, onDismiss }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ShareAnswers>(DEFAULT_ANSWERS);
  const [busy, setBusy] = useState(false);

  const slide = (SLIDES[step] ?? SLIDES[0]) as (typeof SLIDES)[number];
  const isLast = step === SLIDES.length - 1;

  const { open: openPlaid, opening } = usePlaidLinkFlow({
    createLinkToken: async () => {
      const res = await plaidApi.createLinkToken.$post({ json: {} });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to start Plaid Link");
      }
      const data = await res.json();
      return { hookToken: data.hookToken, link_token: data.link_token };
    },
    onError: (msg) => toast.error(msg),
    onSuccess: async () => {
      toast.success("Account connected. Transactions syncing…");
      await finish();
    },
    resolveLink: async (args) => {
      const res = await plaidApi.resolveLink.$post({ json: args });
      if (!res.ok) {
        throw new Error("Failed to resolve Plaid Link");
      }
    },
  });

  const setAnswer = (v: boolean) => {
    if (slide.key === "connect" || slide.key === "intro") {
      return;
    }
    setAnswers((a) => ({ ...a, [slide.key]: v }));
  };

  const finish = async () => {
    setBusy(true);
    try {
      const res = await userApi.sharingSettings.$post({ json: answers });
      if (!res.ok) {
        toast.error("Could not save preferences");
        return;
      }
      onComplete();
    } catch {
      toast.error("Could not save preferences");
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (isLast) {
      await finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const skip = async () => {
    await finish();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent
        className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto gap-0 border border-white/10 bg-zinc-700/40 p-5 sm:p-6 text-white ring-1 ring-white/10 shadow-xl shadow-black/30 backdrop-blur-[8px] backdrop-saturate-[0.7]"
        overlayClassName="bg-zinc-900/40 supports-backdrop-filter:backdrop-blur-[2px]"
      >
        <DialogTitle className="sr-only">{slide.title}</DialogTitle>

        <div className="mb-4 flex items-center gap-1">
          {SLIDES.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded-full transition ${
                i <= step ? "bg-white/70" : "bg-white/15"
              }`}
            />
          ))}
        </div>

        <h2 className="mb-2 text-xl font-semibold">{slide.title}</h2>
        <p className="text-white/65 mb-6 text-sm">{slide.body}</p>

        {(() => {
          if (slide.key === "intro") {
            return (
              <button
                className="bg-white text-zinc-900 hover:bg-white/90 w-full rounded-md px-4 py-2 text-sm font-medium"
                onClick={() => void next()}
                type="button"
              >
                Get started
              </button>
            );
          }
          if (slide.key === "connect") {
            return (
              <div className="flex flex-col gap-2">
                <button
                  className="bg-white text-zinc-900 hover:bg-white/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
                  disabled={opening || busy}
                  onClick={openPlaid}
                  type="button"
                >
                  {opening ? "Opening Plaid…" : "Connect bank"}
                </button>
                <button
                  className="text-white/60 hover:text-white text-xs"
                  disabled={busy}
                  onClick={skip}
                  type="button"
                >
                  I'll connect later
                </button>
              </div>
            );
          }
          return (
            <div className="flex gap-2">
              <button
                className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition ${
                  answers[slide.key] === false
                    ? "border-white/30 bg-white/15"
                    : "border-white/10 hover:bg-white/5"
                }`}
                onClick={() => {
                  setAnswer(false);
                  void next();
                }}
                type="button"
              >
                No
              </button>
              <button
                className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition ${
                  answers[slide.key] === true
                    ? "border-white/30 bg-white/15"
                    : "border-white/10 hover:bg-white/5"
                }`}
                onClick={() => {
                  setAnswer(true);
                  void next();
                }}
                type="button"
              >
                Yes
              </button>
            </div>
          );
        })()}

        <div className="mt-4 flex items-center justify-between">
          <button
            className="text-white/50 hover:text-white text-xs disabled:opacity-40"
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            type="button"
          >
            Back
          </button>
          <span className="text-white/40 text-xs">
            {step + 1} of {SLIDES.length}
          </span>
          <button
            className="text-white/50 hover:text-white text-xs disabled:opacity-40"
            disabled={busy}
            onClick={skip}
            type="button"
          >
            Skip
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
