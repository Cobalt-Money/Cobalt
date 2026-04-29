import type { AddAccountInstitution } from "./types";

/**
 * Full SnapTrade-supported brokerage list (mirrored from horizon-test's
 * `STATIC_BROKERAGES`). `slug` is the SnapTrade broker identifier used by
 * `/api/snaptrade/generateConnectionPortal`. `domain` feeds Brandfetch via
 * `InstitutionLogo`'s `institutionUrl` candidate chain.
 */
interface SnaptradeSeed {
  id: string;
  name: string;
  slug: string;
  domain: string;
}

const SNAPTRADE_SEEDS: readonly SnaptradeSeed[] = [
  {
    domain: "ajbell.co.uk",
    id: "snaptrade:aj-bell",
    name: "AJ Bell",
    slug: "AJ-BELL",
  },
  {
    domain: "alpaca.markets",
    id: "snaptrade:alpaca-paper",
    name: "Alpaca Paper",
    slug: "ALPACA-PAPER",
  },
  {
    domain: "binance.com",
    id: "snaptrade:binance",
    name: "Binance",
    slug: "BINANCE",
  },
  { domain: "getbux.com", id: "snaptrade:bux", name: "Bux", slug: "BUX" },
  { domain: "chase.com", id: "snaptrade:chase", name: "Chase", slug: "CHASE" },
  {
    domain: "coinbase.com",
    id: "snaptrade:coinbase",
    name: "Coinbase",
    slug: "COINBASE",
  },
  {
    domain: "commsec.com.au",
    id: "snaptrade:commsec",
    name: "Commsec",
    slug: "COMMSEC",
  },
  {
    domain: "degiro.com",
    id: "snaptrade:degiro",
    name: "DEGIRO",
    slug: "DEGIRO",
  },
  {
    domain: "etrade.com",
    id: "snaptrade:etrade",
    name: "E-Trade",
    slug: "ETRADE",
  },
  {
    domain: "empower.com",
    id: "snaptrade:empower",
    name: "Empower",
    slug: "EMPOWER",
  },
  {
    domain: "fidelity.com",
    id: "snaptrade:fidelity",
    name: "Fidelity",
    slug: "FIDELITY",
  },
  {
    domain: "interactivebrokers.com",
    id: "snaptrade:ibkr",
    name: "Interactive Brokers",
    slug: "INTERACTIVE-BROKERS-FLEX",
  },
  {
    domain: "kraken.com",
    id: "snaptrade:kraken",
    name: "Kraken",
    slug: "KRAKEN",
  },
  {
    domain: "moomoo.com",
    id: "snaptrade:moomoo",
    name: "Moomoo",
    slug: "MOOMOO",
  },
  {
    domain: "public.com",
    id: "snaptrade:public",
    name: "Public",
    slug: "PUBLIC",
  },
  {
    domain: "questrade.com",
    id: "snaptrade:questrade",
    name: "Questrade",
    slug: "QUESTRADE-UNOFFICIAL",
  },
  {
    domain: "robinhood.com",
    id: "snaptrade:robinhood",
    name: "Robinhood",
    slug: "ROBINHOOD",
  },
  {
    domain: "schwab.com",
    id: "snaptrade:schwab",
    name: "Schwab",
    slug: "SCHWAB",
  },
  {
    domain: "hellostake.com",
    id: "snaptrade:stake-au",
    name: "Stake Australia",
    slug: "STAKEAUS",
  },
  {
    domain: "tastytrade.com",
    id: "snaptrade:tastytrade",
    name: "tastytrade",
    slug: "TASTYTRADE",
  },
  {
    domain: "td.com",
    id: "snaptrade:td-direct",
    name: "TD Direct Investing",
    slug: "TD-DIRECT-INVESTING",
  },
  {
    domain: "trading212.com",
    id: "snaptrade:trading212",
    name: "Trading212",
    slug: "TRADING212",
  },
  {
    domain: "unocoin.com",
    id: "snaptrade:unocoin",
    name: "Unocoin",
    slug: "UNOCOIN",
  },
  {
    domain: "upstox.com",
    id: "snaptrade:upstox",
    name: "Upstox",
    slug: "UPSTOX",
  },
  {
    domain: "vanguard.com",
    id: "snaptrade:vanguard",
    name: "Vanguard",
    slug: "VANGUARD",
  },
  {
    domain: "wealthsimple.com",
    id: "snaptrade:wealthsimple",
    name: "Wealthsimple Trade",
    slug: "WEALTHSIMPLETRADE",
  },
  {
    domain: "webull.com",
    id: "snaptrade:webull",
    name: "Webull",
    slug: "WEBULL",
  },
  {
    domain: "webull.com",
    id: "snaptrade:webull-ca",
    name: "Webull Canada",
    slug: "WEBULL-CANADA",
  },
  {
    domain: "wellsfargo.com",
    id: "snaptrade:wells-fargo",
    name: "Wells Fargo",
    slug: "WELLS-FARGO",
  },
  {
    domain: "zerodha.com",
    id: "snaptrade:zerodha",
    name: "Zerodha",
    slug: "ZERODHA",
  },
];

export const SNAPTRADE_INSTITUTIONS: readonly AddAccountInstitution[] =
  SNAPTRADE_SEEDS.map((s) => ({
    categories: ["brokerage"],
    id: s.id,
    logo: null,
    name: s.name,
    provider: "snaptrade",
    snaptradeBroker: s.slug,
    url: s.domain,
  }));

/**
 * Plaid institution names whose brokerage side is owned by SnapTrade.
 * Plaid still owns their bank/credit products, so we only blocklist when the
 * user is filtering Brokerage — full blocklisting would hide e.g. Chase debit.
 */
const SNAPTRADE_NAME_SET = new Set(
  SNAPTRADE_INSTITUTIONS.map((i) => i.name.toLowerCase())
);

export function isSnaptradeOwnedBrokerage(plaidName: string): boolean {
  return SNAPTRADE_NAME_SET.has(plaidName.toLowerCase());
}

/**
 * Curated default bank list shown on the Banks tab before the user types.
 * Clicking any of these still opens Plaid Link generically — the user picks
 * the real institution inside Plaid — so the IDs here are local-only labels
 * and the `domain` exists purely so Brandfetch can resolve a logo.
 */
interface PlaidSeed {
  id: string;
  name: string;
  domain: string;
}

// Real Plaid `institution_id`s sourced from our `institution` table + Plaid
// `/institutions/search`. Using real ids (instead of synthetic seeds like
// `plaid-default:citi`) lets the server's Scenario C dedup match directly
// against `bank_connection.institutionId` — no domain-table join, no extra
// `/institutions/search` call.
const PLAID_BANK_SEEDS: readonly PlaidSeed[] = [
  { domain: "chase.com", id: "plaid:ins_56", name: "Chase" },
  {
    domain: "bankofamerica.com",
    id: "plaid:ins_127989",
    name: "Bank of America",
  },
  {
    domain: "wellsfargo.com",
    id: "plaid:ins_127991",
    name: "Wells Fargo",
  },
  { domain: "citi.com", id: "plaid:ins_5", name: "Citi" },
  {
    domain: "capitalone.com",
    id: "plaid:ins_128026",
    name: "Capital One",
  },
  { domain: "usbank.com", id: "plaid:ins_127990", name: "U.S. Bank" },
  { domain: "pnc.com", id: "plaid:ins_13", name: "PNC" },
  { domain: "td.com", id: "plaid:ins_14", name: "TD Bank" },
  { domain: "truist.com", id: "plaid:ins_130888", name: "Truist" },
  { domain: "ally.com", id: "plaid:ins_25", name: "Ally Bank" },
  { domain: "sofi.com", id: "plaid:ins_126339", name: "SoFi" },
  { domain: "marcus.com", id: "plaid:ins_52", name: "Marcus" },
  {
    domain: "discover.com",
    id: "plaid:ins_33",
    name: "Discover Bank",
  },
  {
    domain: "citizensbank.com",
    id: "plaid:ins_20",
    name: "Citizens",
  },
  { domain: "53.com", id: "plaid:ins_26", name: "Fifth Third" },
  { domain: "us.hsbc.com", id: "plaid:ins_136937", name: "HSBC" },
  { domain: "bmo.com", id: "plaid:ins_129313", name: "BMO" },
  { domain: "key.com", id: "plaid:ins_29", name: "KeyBank" },
  { domain: "regions.com", id: "plaid:ins_19", name: "Regions" },
  {
    domain: "huntington.com",
    id: "plaid:ins_21",
    name: "Huntington",
  },
  { domain: "mtb.com", id: "plaid:ins_27", name: "M&T Bank" },
  {
    domain: "navyfederal.org",
    id: "plaid:ins_15",
    name: "Navy Federal",
  },
  { domain: "usaa.com", id: "plaid:ins_7", name: "USAA" },
  { domain: "chime.com", id: "plaid:ins_35", name: "Chime" },
  { domain: "varomoney.com", id: "plaid:ins_129229", name: "Varo" },
  { domain: "current.com", id: "plaid:ins_132401", name: "Current" },
  { domain: "venmo.com", id: "plaid:ins_132083", name: "Venmo" },
  { domain: "paypal.com", id: "plaid:ins_22", name: "PayPal" },
  {
    domain: "wealthfront.com",
    id: "plaid:ins_115617",
    name: "Wealthfront",
  },
  {
    domain: "betterment.com",
    id: "plaid:ins_115605",
    name: "Betterment",
  },
  {
    domain: "fidelity.com",
    id: "plaid:ins_12",
    name: "Fidelity",
  },
  {
    domain: "schwab.com",
    id: "plaid:ins_11",
    name: "Charles Schwab",
  },
  {
    domain: "morganstanley.com",
    id: "plaid:ins_115699",
    name: "Morgan Stanley",
  },
  {
    domain: "santanderbank.com",
    id: "plaid:ins_28",
    name: "Santander",
  },
  { domain: "amerisbank.com", id: "plaid:ins_119189", name: "Ameris Bank" },
  { domain: "comerica.com", id: "plaid:ins_100103", name: "Comerica" },
  { domain: "zionsbank.com", id: "plaid:ins_113973", name: "Zions Bank" },
  {
    domain: "firsthorizon.com",
    id: "plaid:ins_115587",
    name: "First Horizon",
  },
  {
    domain: "synchronybank.com",
    id: "plaid:ins_116589",
    name: "Synchrony Bank",
  },
  { domain: "cit.com", id: "plaid:ins_132364", name: "CIT Bank" },
  { domain: "axosbank.com", id: "plaid:ins_116862", name: "Axos Bank" },
  { domain: "penfed.org", id: "plaid:ins_116798", name: "PenFed" },
  {
    domain: "alliantcreditunion.org",
    id: "plaid:ins_116282",
    name: "Alliant",
  },
  {
    domain: "schoolsfirstfcu.org",
    id: "plaid:ins_118051",
    name: "SchoolsFirst FCU",
  },
  {
    domain: "firsttechfed.com",
    id: "plaid:ins_113801",
    name: "First Tech FCU",
  },
  {
    domain: "websterbank.com",
    id: "plaid:ins_116225",
    name: "Webster Bank",
  },
  {
    domain: "cnb.com",
    id: "plaid:ins_117136",
    name: "City National",
  },
];

const PLAID_CREDIT_SEEDS: readonly PlaidSeed[] = [
  {
    domain: "americanexpress.com",
    id: "plaid:ins_10",
    name: "American Express",
  },
  { domain: "chase.com", id: "plaid:ins_56", name: "Chase" },
  {
    domain: "capitalone.com",
    id: "plaid:ins_128026",
    name: "Capital One",
  },
  { domain: "citi.com", id: "plaid:ins_5", name: "Citi" },
  { domain: "discover.com", id: "plaid:ins_33", name: "Discover" },
  {
    domain: "bankofamerica.com",
    id: "plaid:ins_127989",
    name: "Bank of America",
  },
  {
    domain: "wellsfargo.com",
    id: "plaid:ins_127991",
    name: "Wells Fargo",
  },
  {
    domain: "barclaycardus.com",
    id: "plaid:ins_51",
    name: "Barclays",
  },
];

export const PLAID_DEFAULT_BANKS: readonly AddAccountInstitution[] =
  PLAID_BANK_SEEDS.map((s) => ({
    categories: ["bank"],
    id: s.id,
    logo: null,
    name: s.name,
    provider: "plaid",
    url: s.domain,
  }));

export const PLAID_DEFAULT_CREDIT: readonly AddAccountInstitution[] =
  PLAID_CREDIT_SEEDS.map((s) => ({
    categories: ["credit"],
    id: s.id,
    logo: null,
    name: s.name,
    provider: "plaid",
    url: s.domain,
  }));

/**
 * Manual cash account option — appears in the Add Account grid alongside
 * Plaid/SnapTrade institutions. Selecting this opens the cash-account form
 * instead of launching an external connect flow. Multiple cash accounts are
 * allowed; the tile stays available even after the user has created one.
 */
export const MANUAL_CASH_OPTION: AddAccountInstitution = {
  categories: ["cash", "bank"],
  id: "manual:cash",
  logo: null,
  name: "Cash",
  provider: "manual",
  url: null,
};
