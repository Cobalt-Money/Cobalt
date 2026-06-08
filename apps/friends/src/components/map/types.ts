import type { MAP_STYLES } from "./constants";

// Filter bucket = Plaid PFC detailed → systemKey. Keeps panel 1:1 with icons.
export type Category = string;

export type ViewMode = "pins" | "people";
export type MarkerStyle = "dots" | "landmark";

export type TimeWindow = 7 | 30 | 90 | 0;

export type StyleKey = keyof typeof MAP_STYLES;

export interface PinDatum {
  id: string;
  position: [number, number];
  merchant: string;
  amount: number;
  person: string;
  userId: string;
  category: Category;
  paymentChannel: string | null;
  date: string | number | null;
  logoUrl: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  notes: string | null;
  cardName: string | null;
  institutionName: string | null;
  amountHidden: boolean;
  merchantHidden: boolean;
}

export interface HoverState {
  pin: PinDatum;
  x: number;
  y: number;
}

export interface GlassConfig {
  blurPx: number;
  bgAlpha: number;
  saturate: number;
  borderAlpha: number;
  ringAlpha: number;
}

export interface GlassStyle {
  style: React.CSSProperties;
  textClass: string;
  mutedClass: string;
  dividerClass: string;
  hoverClass: string;
}

export interface PersonAgg {
  userId: string;
  name: string;
  total: number;
  count: number;
  lat: number;
  lon: number;
  byCat: Record<string, number>;
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
  logoUrl: string | null;
  website: string | null;
}

export interface UnmappedTxn {
  id: string;
  merchantName: string | null;
  name: string | null;
  amount: number | string | null;
  date: string | number | null;
  address: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  website: string | null;
}
