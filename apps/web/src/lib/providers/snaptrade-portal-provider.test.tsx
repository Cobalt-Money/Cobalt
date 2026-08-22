import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { SnaptradePortalProvider, useSnaptradePortal } from "./snaptrade-portal-provider";

const toastError = vi.spyOn(toast, "error").mockReturnValue("error-toast");
const toastSuccess = vi.spyOn(toast, "success").mockReturnValue("success-toast");

vi.mock(import("snaptrade-react"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    SnapTradeReact: (({ onError, onSuccess }) => (
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
    )) as typeof actual.SnapTradeReact,
  };
});

function PortalLauncher() {
  const { openSnaptradePortal } = useSnaptradePortal();
  return (
    <button onClick={() => openSnaptradePortal("https://app.snaptrade.com/portal")} type="button">
      Open
    </button>
  );
}

describe("SnaptradePortalProvider", () => {
  it("closes the portal and confirms a successful connection", async () => {
    render(
      <SnaptradePortalProvider>
        <PortalLauncher />
      </SnaptradePortalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(await screen.findByRole("button", { name: "Complete" }));

    expect(screen.queryByLabelText("SnapTrade portal")).toBeNull();
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
