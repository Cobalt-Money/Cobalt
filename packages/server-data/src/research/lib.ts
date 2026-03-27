// ── Ticker normalization ────────────────────────────────────────────

export function normalizeTickerForAlphaVantage(ticker: string): string {
  return ticker.replaceAll(".", "-");
}

// ── PriceData type ─────────────────────────────────────────────────

export interface PriceData {
  time: string;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

// ── Eastern-time helpers ───────────────────────────────────────────

const EST_TIMEZONE = "America/New_York";

export function parseAsEasternTime(datetimeStr: string): Date {
  const [datePart, timePart = "00:00:00"] = datetimeStr.split(" ");
  const testDate = new Date(`${datePart}T12:00:00-05:00`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
  const formatted = formatter.format(testDate);
  const isDST = formatted.includes("EDT");
  const offset = isDST ? "-04:00" : "-05:00";
  return new Date(`${datePart}T${timePart}${offset}`);
}

// ── Alpha Vantage response types ───────────────────────────────────

interface TimeSeriesDataPoint {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
  "5. volume": string;
}

interface AlphaVantageIntradayResponse {
  "Meta Data"?: Record<string, string>;
  [key: string]: unknown;
}

interface AlphaVantageDailyResponse {
  "Meta Data"?: Record<string, string>;
  "Time Series (Daily)"?: Record<string, TimeSeriesDataPoint>;
}

export interface AlphaVantageQuoteResponse {
  "Global Quote"?: {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
  "Global Quote - DATA DELAYED BY 15 MINUTES"?: {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
}

// ── Data processing ────────────────────────────────────────────────

export function processQuoteData(
  quoteResponse: AlphaVantageQuoteResponse,
  companyName?: string
): {
  currentPrice: number;
  change: number;
  changePercent: number;
  companyName: string;
} {
  const quoteData =
    quoteResponse["Global Quote"] ??
    quoteResponse["Global Quote - DATA DELAYED BY 15 MINUTES"];

  if (!quoteData) {
    throw new Error("No quote data available");
  }

  return {
    change: Number.parseFloat(quoteData["09. change"]),
    changePercent: Number.parseFloat(
      quoteData["10. change percent"].replace("%", "")
    ),
    companyName: companyName ?? quoteData["01. symbol"],
    currentPrice: Number.parseFloat(quoteData["05. price"]),
  };
}

export function processIntradayData(
  response: AlphaVantageIntradayResponse,
  intervalKey: string
): PriceData[] {
  const timeSeries = response[intervalKey] as
    | Record<string, TimeSeriesDataPoint>
    | undefined;
  if (!timeSeries || typeof timeSeries !== "object") {
    return [];
  }

  return Object.entries(timeSeries)
    .map(([datetime, values]) => {
      const date = parseAsEasternTime(datetime);
      return {
        close: Number.parseFloat(values["4. close"] || "0"),
        high: Number.parseFloat(values["2. high"] || "0"),
        low: Number.parseFloat(values["3. low"] || "0"),
        open: Number.parseFloat(values["1. open"] || "0"),
        price: Number.parseFloat(values["4. close"] || "0"),
        time: date.toISOString(),
        volume: Number.parseInt(values["5. volume"] || "0", 10),
      };
    })
    .toReversed();
}

export function processDailyData(
  response: AlphaVantageDailyResponse
): PriceData[] {
  const timeSeries = response["Time Series (Daily)"];
  if (!timeSeries) {
    return [];
  }

  return Object.entries(timeSeries)
    .map(([date, values]) => {
      const dateObj = parseAsEasternTime(date);
      return {
        close: Number.parseFloat(values["4. close"] || "0"),
        high: Number.parseFloat(values["2. high"] || "0"),
        low: Number.parseFloat(values["3. low"] || "0"),
        open: Number.parseFloat(values["1. open"] || "0"),
        price: Number.parseFloat(values["4. close"] || "0"),
        time: dateObj.toISOString(),
        volume: Number.parseInt(values["5. volume"] || "0", 10),
      };
    })
    .toReversed();
}

// ── Chart aggregation ──────────────────────────────────────────────

/** Returns the last element of a non-empty array. Only call after a length check. */
function lastOf<T>(arr: T[]): T {
  return arr.at(-1) as T;
}

export type TimePeriod =
  | "1D"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "All";

function parseDate(timeString: string): Date | null {
  const date = new Date(timeString);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }
  const fallback = new Date(timeString.replace(/\.\d+/, ""));
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  return null;
}

function getESTParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    month: "numeric",
    timeZone: EST_TIMEZONE,
    weekday: "short",
    year: "numeric",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = {
    Fri: 5,
    Mon: 1,
    Sat: 6,
    Sun: 0,
    Thu: 4,
    Tue: 2,
    Wed: 3,
  };
  return {
    day: Number.parseInt(get("day"), 10),
    hour: Number.parseInt(get("hour"), 10) % 24,
    minute: Number.parseInt(get("minute"), 10),
    month: Number.parseInt(get("month"), 10),
    weekday: weekdayMap[get("weekday")] ?? -1,
    year: Number.parseInt(get("year"), 10),
  };
}

function isMarketHours(date: Date): boolean {
  const { hour, minute, weekday } = getESTParts(date);
  if (weekday === 0 || weekday === 6) {
    return false;
  }
  if (hour < 9 || (hour === 9 && minute < 30)) {
    return false;
  }
  if (hour >= 16) {
    return false;
  }
  return true;
}

function getESTDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: EST_TIMEZONE });
}

function aggregateTo10Minutes(data: PriceData[]): PriceData[] {
  if (!data.length) {
    return [];
  }
  const last = data.at(-1);
  if (!last) {
    return [];
  }
  const mostRecentDate = parseDate(last.time);
  if (!mostRecentDate) {
    return [];
  }
  const targetDateStr = getESTDateString(mostRecentDate);

  const groups: Record<string, { bars: PriceData[]; bucketTime: Date }> = {};
  const tenMinMs = 10 * 60 * 1000;

  for (const pd of data) {
    const date = parseDate(pd.time);
    if (!date || !isMarketHours(date)) {
      continue;
    }
    if (getESTDateString(date) !== targetDateStr) {
      continue;
    }

    const bucketMs = Math.floor(date.getTime() / tenMinMs) * tenMinMs;
    const bucketDate = new Date(bucketMs);
    const key = bucketDate.toISOString();

    if (!groups[key]) {
      groups[key] = { bars: [], bucketTime: bucketDate };
    }
    groups[key].bars.push(pd);
  }

  return Object.entries(groups)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(
      ([, { bars, bucketTime }]): PriceData => ({
        ...lastOf(bars),
        time: bucketTime.toISOString(),
      })
    );
}

function aggregateToHourly(data: PriceData[]): PriceData[] {
  const groups: Record<string, { bars: PriceData[]; bucketTime: Date }> = {};
  const hourMs = 60 * 60 * 1000;

  for (const pd of data) {
    const date = parseDate(pd.time);
    if (!date || !isMarketHours(date)) {
      continue;
    }

    const bucketMs = Math.floor(date.getTime() / hourMs) * hourMs;
    const bucketDate = new Date(bucketMs);
    const key = bucketDate.toISOString();

    if (!groups[key]) {
      groups[key] = { bars: [], bucketTime: bucketDate };
    }
    groups[key].bars.push(pd);
  }

  return Object.entries(groups)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(
      ([, { bars, bucketTime }]): PriceData => ({
        ...lastOf(bars),
        time: bucketTime.toISOString(),
      })
    );
}

function extractEndOfDayPrices(
  data: PriceData[],
  daysBack?: number
): PriceData[] {
  if (!data.length) {
    return [];
  }

  const sorted = [...data].toSorted((a, b) => {
    const dA = parseDate(a.time);
    const dB = parseDate(b.time);
    return (dB?.getTime() ?? 0) - (dA?.getTime() ?? 0);
  });

  const [first] = sorted;
  if (!first) {
    return [];
  }
  const mostRecent = parseDate(first.time);
  if (!mostRecent) {
    return [];
  }

  let cutoff: Date | null = null;
  if (daysBack) {
    cutoff = new Date(mostRecent);
    cutoff.setDate(cutoff.getDate() - daysBack);
  }

  return sorted
    .filter((pd) => {
      const d = parseDate(pd.time);
      if (!d) {
        return false;
      }
      if (cutoff && d < cutoff) {
        return false;
      }
      return true;
    })
    .toReversed();
}

function extractYTDPrices(data: PriceData[]): PriceData[] {
  if (!data.length) {
    return [];
  }
  const { year } = getESTParts(new Date());
  const startOfYear = new Date(`${year}-01-01T00:00:00-05:00`);

  return data
    .filter((pd) => {
      const d = parseDate(pd.time);
      return d && d >= startOfYear;
    })
    .toSorted((a, b) => {
      const dA = parseDate(a.time);
      const dB = parseDate(b.time);
      return (dA?.getTime() ?? 0) - (dB?.getTime() ?? 0);
    });
}

function aggregateToWeekly(data: PriceData[], daysBack?: number): PriceData[] {
  if (!data.length) {
    return [];
  }
  const filtered = daysBack ? extractEndOfDayPrices(data, daysBack) : data;
  const groups: Record<string, PriceData[]> = {};
  const dayMs = 24 * 60 * 60 * 1000;

  for (const pd of filtered) {
    const date = parseDate(pd.time);
    if (!date) {
      continue;
    }
    const { weekday } = getESTParts(date);
    const sundayMs = date.getTime() - weekday * dayMs;
    const key = new Date(Math.floor(sundayMs / dayMs) * dayMs).toISOString();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(pd);
  }

  return Object.entries(groups)
    .map(([, group]): PriceData => lastOf(group))
    .toSorted(
      (a, b) =>
        (parseDate(a.time)?.getTime() ?? 0) -
        (parseDate(b.time)?.getTime() ?? 0)
    );
}

function aggregateToYearly(data: PriceData[]): PriceData[] {
  if (!data.length) {
    return [];
  }
  const groups: Record<number, PriceData[]> = {};

  for (const pd of data) {
    const date = parseDate(pd.time);
    if (!date) {
      continue;
    }
    const { year } = getESTParts(date);
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(pd);
  }

  return Object.entries(groups)
    .map(([, group]): PriceData => lastOf(group))
    .toSorted(
      (a, b) =>
        (parseDate(a.time)?.getTime() ?? 0) -
        (parseDate(b.time)?.getTime() ?? 0)
    );
}

export function filterChartData(
  data: PriceData[],
  timePeriod: TimePeriod
): PriceData[] {
  if (!data || data.length === 0) {
    return [];
  }

  switch (timePeriod) {
    case "1D": {
      return aggregateTo10Minutes(data);
    }
    case "1W": {
      return aggregateToHourly(extractEndOfDayPrices(data, 7));
    }
    case "1M": {
      return extractEndOfDayPrices(data, 30);
    }
    case "3M": {
      return extractEndOfDayPrices(data, 90);
    }
    case "6M": {
      return extractEndOfDayPrices(data, 180);
    }
    case "YTD": {
      return extractYTDPrices(data);
    }
    case "1Y": {
      return aggregateToWeekly(data, 365);
    }
    case "All": {
      return aggregateToYearly(data);
    }
    default: {
      return data;
    }
  }
}

export function getIntervalForTimePeriod(
  timePeriod: TimePeriod
): "1min" | "60min" | "daily" {
  switch (timePeriod) {
    case "1D":
    case "1W": {
      return "1min";
    }
    default: {
      return "daily";
    }
  }
}
