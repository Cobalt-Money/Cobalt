import { Skeleton } from "@cobalt-web/ui/components/skeleton";
import { cn } from "@cobalt-web/ui/lib/utils";

const GRID_TEMPLATE_COLUMNS = "2.75rem 8rem minmax(8rem, 14rem) repeat(6, minmax(0, 1fr))";

const HEADERS = [
  "",
  "Symbol",
  "Name",
  "Price",
  "P/E",
  "Market cap",
  "Revenue",
  "Volume",
  "Sector",
] as const;

const SKELETON_ROW_COUNT = 16;

export function StockScreenerSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <table className="block w-full text-sm">
        <thead className="block">
          <tr className="grid items-center" style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}>
            {HEADERS.map((header, i) => (
              <th
                className={cn(
                  "h-10 min-w-0 text-left font-normal text-muted-foreground",
                  i === 0 && "min-w-[2.75rem] shrink-0 pr-3",
                  i === 1 && "pl-1",
                )}
                key={header || `col-${i}`}
                scope="col"
              >
                <span className="inline-flex h-full items-center">{header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIdx) => (
            <tr
              className="grid items-center"
              key={rowIdx}
              style={{
                gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                height: 44,
              }}
            >
              {/* Pin column */}
              <td className="flex min-w-[2.75rem] shrink-0 items-center pr-3">
                <Skeleton className="size-5 rounded-md" />
              </td>
              {/* Symbol + logo */}
              <td className="flex min-w-0 items-center gap-3.5 pl-1">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </td>
              {/* Name */}
              <td className="flex min-w-0 items-center">
                <Skeleton className="h-4 w-3/4" />
              </td>
              {/* Price, P/E, Market cap, Revenue, Volume */}
              {Array.from({ length: 5 }).map((__, i) => (
                <td className="flex min-w-0 items-center" key={i}>
                  <Skeleton className="h-4 w-12" />
                </td>
              ))}
              {/* Sector */}
              <td className="flex min-w-0 items-center gap-1.5">
                <Skeleton className="size-4 shrink-0 rounded" />
                <Skeleton className="h-4 w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
