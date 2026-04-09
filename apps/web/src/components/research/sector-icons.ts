import {
  BankIcon,
  Building02Icon,
  CpuIcon,
  ElectricHome01Icon,
  EnergyIcon,
  FactoryIcon,
  GlobeIcon,
  HospitalIcon,
  Mining01Icon,
  ShoppingBag01Icon,
  ShoppingBasket01Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";

/**
 * FMP `company-screener` returns `sector` as a string — not an enum in our API.
 * These keys match common GICS / Yahoo-style labels (case-insensitive after
 * {@link normalizeSector}).
 *
 * @see https://site.financialmodelingprep.com/developer/docs/all-available-sectors (FMP “available sectors”)
 */
const SECTOR_ICON_BY_NORMALIZED: Record<string, typeof GlobeIcon> = {
  "basic materials": Mining01Icon,
  communication: Wifi01Icon,
  "communication services": Wifi01Icon,
  "consumer cyclical": ShoppingBag01Icon,
  "consumer defensive": ShoppingBasket01Icon,
  "consumer discretionary": ShoppingBag01Icon,
  "consumer staples": ShoppingBasket01Icon,
  energy: EnergyIcon,
  "financial services": BankIcon,
  financials: BankIcon,
  "health care": HospitalIcon,
  healthcare: HospitalIcon,
  industrials: FactoryIcon,
  "information technology": CpuIcon,
  materials: Mining01Icon,
  "real estate": Building02Icon,
  technology: CpuIcon,
  utilities: ElectricHome01Icon,
};

/** Normalized labels we map to a dedicated icon (not the generic globe). */
export const KNOWN_SECTOR_NORMALIZED_LABELS: readonly string[] = Object.keys(
  SECTOR_ICON_BY_NORMALIZED
).toSorted((a, b) => a.localeCompare(b));

export function normalizeSector(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

/** Hugeicons icon for a sector string; unknown / empty → {@link GlobeIcon}. */
export function sectorHugeiconForValue(raw: unknown) {
  const key = normalizeSector(raw);
  if (!key) {
    return GlobeIcon;
  }
  return SECTOR_ICON_BY_NORMALIZED[key] ?? GlobeIcon;
}
