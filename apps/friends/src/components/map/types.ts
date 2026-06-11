import type { MAP_STYLES } from "./constants";

// Filter bucket = Plaid PFC detailed → systemKey. Keeps panel 1:1 with icons.
export type Category = string;

export type ViewMode = "pins" | "people" | "places";
export type MarkerStyle = "dots" | "landmark";

export type TimeWindow = 7 | 30 | 90 | 0;

export type CityFilter = "all" | "nyc" | "sf";

export type StyleKey = keyof typeof MAP_STYLES;

export interface PinDatum {
  id: string;
  position: [number, number];
  merchant: string;
  amount: number;
  person: string;
  personImageUrl: string | null;
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
  imageUrl: string | null;
  total: number;
  count: number;
  lat: number;
  lon: number;
  byCat: Record<string, number>;
  byMerchant: Record<string, number>;
}

export interface PlaceMerchant {
  merchant: string;
  total: number;
  count: number;
  logoUrl: string | null;
  website: string | null;
  position: [number, number];
}

export interface PlaceAgg {
  key: string;
  city: string | null;
  region: string | null;
  total: number;
  count: number;
  merchants: PlaceMerchant[];
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
