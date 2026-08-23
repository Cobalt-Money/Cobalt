import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { SnaptradePortalProvider, useSnaptradePortal } from "./snaptrade-portal-provider";

const toastError = vi.spyOn(toast, "error").mockReturnValue("error-toast");
const toastSuccess = vi.spyOn(toast, "success").mockReturnValue("success-toast");

vi.mock(
  import("snaptrade-react"),
  () =>
    ({
      SnapTradeReact: ({
        onError,
        onSuccess,
      }: {
        onError?: (error: { detail: string; statusCode: string }) => void;
        onSuccess?: (authorizationId: string) => void;
      }) => (
        <div aria-label="SnapTrade portal">
          <button onClick={() => onSuccess?.("authorization-1")} type="button">
            Complete
          </button>
          <button
            onClick={() => onError?.({ detail: "Fidelity is unavailable", statusCode: "500" })}
            type="button"
          >
            Fail
          </button>
        </div>
      ),
    }) as unknown as typeof import("snaptrade-react"),
);

function PortalLauncher({ onSuccess }: { onSuccess?: (authorizationId?: string) => void }) {
  const { openSnaptradePortal } = useSnaptradePortal();
  return (
    <button
      onClick={() => openSnaptradePortal("https://app.snaptrade.com/portal", { onSuccess })}
      type="button"
    >
      Open
    </button>
  );
}

describe("SnaptradePortalProvider", () => {
  it("closes the portal and confirms a successful connection", async () => {
    const onSuccess = vi.fn();
    render(
      <SnaptradePortalProvider>
        <PortalLauncher onSuccess={onSuccess} />
      </SnaptradePortalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(await screen.findByRole("button", { name: "Complete" }));

    expect(screen.queryByLabelText("SnapTrade portal")).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith("authorization-1");
    expect(toastSuccess).toHaveBeenCalledWith("Brokerage connection updated");
  });

  it("closes the portal and surfaces SnapTrade's error detail", async () => {
    render(
      <SnaptradePortalProvider>
        <PortalLauncher />
      </SnaptradePortalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(await screen.findByRole("button", { name: "Fail" }));

    expect(screen.queryByLabelText("SnapTrade portal")).toBeNull();
    expect(toastError).toHaveBeenCalledWith("Fidelity is unavailable");
  });
});
