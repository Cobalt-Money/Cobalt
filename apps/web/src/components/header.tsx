import { Link } from "@tanstack/react-router";

import UserMenu from "./user-menu";

const linkClass = "hover:underline";
const activeClass = "font-semibold underline";

export default function Header() {
  const mainLinks = [
    { label: "Home", to: "/" as const },
    { label: "Board", to: "/dashboard" as const },
  ] as const;

  const zeroTxLinks = [
    { exact: true, label: "Transactions", to: "/transactions" as const },
    {
      exact: false,
      label: "Recurring",
      to: "/transactions/recurring" as const,
    },
    {
      exact: false,
      label: "Credit spending",
      to: "/transactions/credit-spending" as const,
    },
  ] as const;

  return (
    <div>
      <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 py-1">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-lg">
          {mainLinks.map(({ to, label }) => (
            <Link
              activeProps={{ className: activeClass }}
              className={linkClass}
              key={to}
              to={to}
            >
              {label}
            </Link>
          ))}
          <span
            aria-hidden="true"
            className="text-muted-foreground select-none"
          >
            |
          </span>
          {zeroTxLinks.map(({ to, label, exact }) => (
            <Link
              activeOptions={exact ? { exact: true } : undefined}
              activeProps={{ className: activeClass }}
              className={linkClass}
              key={to}
              to={to}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
