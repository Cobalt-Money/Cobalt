import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountConnectionActions } from "./account-connection-actions";
import { SnaptradePortalProvider } from "@/lib/providers/snaptrade-portal-provider";

const { generateConnectionPortal } = vi.hoisted(() => ({
  generateConnectionPortal: vi.fn(),
}));

vi.mock(
  import("@/lib/clients/api-client"),
  () =>
    ({
      accountsApi: {},
      plaidApi: {},
      snaptradeApi: {
        generateConnectionPortal: {
          $post: generateConnectionPortal,
        },
      },
    }) as unknown as typeof import("@/lib/clients/api-client"),
);

vi.mock(import("react-plaid-link"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    usePlaidLink: (() => ({
      error: null,
      exit: vi.fn(),
      open: vi.fn(),
      ready: false,
      submit: vi.fn(),
    })) as typeof actual.usePlaidLink,
  };
});

vi.mock(import("snaptrade-react"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    SnapTradeReact: (({ contentLabel, isOpen }) =>
      isOpen ? <iframe title={contentLabel} /> : null) as typeof actual.SnapTradeReact,
  };
});

describe("AccountConnectionActions", () => {
  it("keeps a SnapTrade reconnect inside the app instead of opening an unmanaged tab", async () => {
    generateConnectionPortal.mockResolvedValue({
      json: () => Promise.resolve({ redirectURI: "https://app.snaptrade.com/portal" }),
      ok: true,
    });
    const windowOpen = vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <SnaptradePortalProvider>
        <AccountConnectionActions
          account={{
            id: "account-1",
            institution: "Fidelity",
            institutionLogo: null,
            institutionLogosExtra: [],
            institutionUrl: null,
            kind: "brokerage",
            plaidItemId: null,
            snaptradeAuthorizationId: "authorization-1",
            source: "snaptrade",
          }}
        />
      </SnaptradePortalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));

    await waitFor(() => {
      expect(generateConnectionPortal).toHaveBeenCalledOnce();
    });
    expect(windowOpen).not.toHaveBeenCalled();
    await expect(screen.findByTitle("Connect brokerage account")).resolves.toBeTruthy();
  });
});
