import type { ExpressionSpecification } from "maplibre-gl";
import type { StyleKey } from "./types";

export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
export const SERVER_URL = import.meta.env.VITE_SERVER_URL as string | undefined;

export const MAP_STYLES = {
  "carto-dark": {
    label: "Carto Dark (labels)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  "carto-dark-nolabels": {
    label: "Carto Dark (no labels)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
  "carto-light": {
    label: "Carto Light (labels)",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  "carto-light-nolabels": {
    label: "Carto Light (no labels)",
    url: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
  },
  "carto-voyager": {
    label: "Carto Voyager (labels)",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  "carto-voyager-nolabels": {
    label: "Carto Voyager (no labels)",
    url: "https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json",
  },
  "maplibre-demo": {
    label: "MapLibre Demo (debug)",
    url: "https://demotiles.maplibre.org/style.json",
  },
  "ofm-bright": {
    label: "OpenFreeMap Bright",
    url: "https://tiles.openfreemap.org/styles/bright",
  },
  "ofm-dark": {
    label: "OpenFreeMap Dark",
    url: "https://tiles.openfreemap.org/styles/dark",
  },
  "ofm-fiord": {
    label: "OpenFreeMap Fiord",
    url: "https://tiles.openfreemap.org/styles/fiord",
  },
  "ofm-liberty": {
    label: "OpenFreeMap Liberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
  "ofm-positron": {
    label: "OpenFreeMap Positron",
    url: "https://tiles.openfreemap.org/styles/positron",
  },
  "versatiles-colorful": {
    label: "Versatiles Colorful",
    url: "https://tiles.versatiles.org/assets/styles/colorful/style.json",
  },
  "versatiles-eclipse": {
    label: "Versatiles Eclipse",
    url: "https://tiles.versatiles.org/assets/styles/eclipse/style.json",
  },
  "versatiles-graybeard": {
    label: "Versatiles Graybeard",
    url: "https://tiles.versatiles.org/assets/styles/graybeard/style.json",
  },
  "versatiles-neutrino": {
    label: "Versatiles Neutrino",
    url: "https://tiles.versatiles.org/assets/styles/neutrino/style.json",
  },
  ...(MAPTILER_KEY && {
    "maptiler-backdrop": {
      label: "MapTiler Backdrop",
      url: `https://api.maptiler.com/maps/backdrop/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-dataviz-dark": {
      label: "MapTiler Dataviz Dark",
      url: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-outdoor": {
      label: "MapTiler Outdoor",
      url: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-satellite": {
      label: "MapTiler Satellite",
      url: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-streets-dark": {
      label: "MapTiler Streets Dark",
      url: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-toner": {
      label: "MapTiler Toner",
      url: `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`,
    },
  }),
} as const;

const LIGHT_STYLE_CANDIDATES = [
  "carto-light",
  "carto-light-nolabels",
  "carto-voyager",
  "carto-voyager-nolabels",
  "ofm-liberty",
  "ofm-bright",
  "ofm-positron",
  "ofm-fiord",
  "versatiles-colorful",
  "versatiles-graybeard",
  "versatiles-neutrino",
  "maptiler-outdoor",
  "maptiler-backdrop",
  "maptiler-toner",
] as const;

// Filter against actual MAP_STYLES keys — maptiler-* entries are absent
// when VITE_MAPTILER_KEY is unset.
export const LIGHT_STYLES: ReadonlySet<StyleKey> = new Set(
  LIGHT_STYLE_CANDIDATES.filter((k) => k in MAP_STYLES) as StyleKey[],
);

export const INITIAL_VIEW_STATE = {
  bearing: 20,
  latitude: 40.7128,
  longitude: -74.006,
  pitch: 60,
  zoom: 12,
};

export const CATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  alcohol_bars: "Bars",
  coffee_shop: "Coffee",
  food_delivery: "Delivery",
  gas_fuel: "Gas",
  pharmacy: "Pharmacy",
  public_transit: "Transit",
  uncategorized: "Other",
};

// MTA Subway Service Lines (data.ny.gov dataset s692-irgq).
// `service` property = route id (e.g. "1","A","L"). ~8MB; loaded on demand.
export const NYC_SUBWAY_URL =
  "https://data.ny.gov/api/geospatial/s692-irgq?method=export&format=GeoJSON";

// Official MTA route colors. https://web.mta.info/developers/resources/line_colors.htm
// MapLibre expression — heterogeneous array. Typed as `ExpressionSpecification`.
export const SUBWAY_LINE_COLOR_EXPR: ExpressionSpecification = [
  "match",
  ["get", "service"],
  "1",
  "#EE352E",
  "2",
  "#EE352E",
  "3",
  "#EE352E",
  "4",
  "#00933C",
  "5",
  "#00933C",
  "6",
  "#00933C",
  "7",
  "#B933AD",
  "A",
  "#2850AD",
  "C",
  "#2850AD",
  "E",
  "#2850AD",
  "B",
  "#FF6319",
  "D",
  "#FF6319",
  "F",
  "#FF6319",
  "M",
  "#FF6319",
  "G",
  "#6CBE45",
  "J",
  "#996633",
  "Z",
  "#996633",
  "L",
  "#A7A9AC",
  "N",
  "#FCCC0A",
  "Q",
  "#FCCC0A",
  "R",
  "#FCCC0A",
  "W",
  "#FCCC0A",
  "S",
  "#808183",
  "T",
  "#00ADD0",
  "#666666",
];
