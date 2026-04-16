import type { AddAccountInstitution } from "./types";

/**
 * Full SnapTrade-supported brokerage list (mirrored from horizon-test's
 * `STATIC_BROKERAGES`). `slug` is the SnapTrade broker identifier used by
 * `/api/snaptrade/generate-connection-portal`. `domain` feeds Brandfetch via
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

const PLAID_BANK_SEEDS: readonly PlaidSeed[] = [
  { domain: "chase.com", id: "plaid-default:chase", name: "Chase" },
  {
    domain: "bankofamerica.com",
    id: "plaid-default:bofa",
    name: "Bank of America",
  },
  {
    domain: "wellsfargo.com",
    id: "plaid-default:wells-fargo",
    name: "Wells Fargo",
  },
  { domain: "citi.com", id: "plaid-default:citi", name: "Citi" },
  {
    domain: "capitalone.com",
    id: "plaid-default:capital-one",
    name: "Capital One",
  },
  { domain: "usbank.com", id: "plaid-default:us-bank", name: "U.S. Bank" },
  { domain: "pnc.com", id: "plaid-default:pnc", name: "PNC" },
  { domain: "td.com", id: "plaid-default:td", name: "TD Bank" },
  { domain: "truist.com", id: "plaid-default:truist", name: "Truist" },
  { domain: "ally.com", id: "plaid-default:ally", name: "Ally Bank" },
  { domain: "sofi.com", id: "plaid-default:sofi", name: "SoFi" },
  { domain: "marcus.com", id: "plaid-default:marcus", name: "Marcus" },
  {
    domain: "discover.com",
    id: "plaid-default:discover-bank",
    name: "Discover Bank",
  },
  {
    domain: "citizensbank.com",
    id: "plaid-default:citizens",
    name: "Citizens",
  },
  { domain: "53.com", id: "plaid-default:fifth-third", name: "Fifth Third" },
  { domain: "us.hsbc.com", id: "plaid-default:hsbc", name: "HSBC" },
  { domain: "bmoharris.com", id: "plaid-default:bmo", name: "BMO" },
  { domain: "key.com", id: "plaid-default:keybank", name: "KeyBank" },
  { domain: "regions.com", id: "plaid-default:regions", name: "Regions" },
  {
    domain: "huntington.com",
    id: "plaid-default:huntington",
    name: "Huntington",
  },
  { domain: "mtb.com", id: "plaid-default:mt", name: "M&T Bank" },
  {
    domain: "navyfederal.org",
    id: "plaid-default:navy-federal",
    name: "Navy Federal",
  },
  { domain: "usaa.com", id: "plaid-default:usaa", name: "USAA" },
  { domain: "chime.com", id: "plaid-default:chime", name: "Chime" },
  { domain: "varomoney.com", id: "plaid-default:varo", name: "Varo" },
  { domain: "current.com", id: "plaid-default:current", name: "Current" },
  { domain: "cash.app", id: "plaid-default:cash-app", name: "Cash App" },
  { domain: "venmo.com", id: "plaid-default:venmo", name: "Venmo" },
  { domain: "paypal.com", id: "plaid-default:paypal", name: "PayPal" },
  {
    domain: "wealthfront.com",
    id: "plaid-default:wealthfront",
    name: "Wealthfront",
  },
  {
    domain: "betterment.com",
    id: "plaid-default:betterment",
    name: "Betterment",
  },
  {
    domain: "fidelity.com",
    id: "plaid-default:fidelity-cash",
    name: "Fidelity Cash Management",
  },
  {
    domain: "schwab.com",
    id: "plaid-default:schwab-bank",
    name: "Schwab Bank",
  },
  {
    domain: "morganstanley.com",
    id: "plaid-default:morgan-stanley",
    name: "Morgan Stanley",
  },
  {
    domain: "firstrepublic.com",
    id: "plaid-default:first-republic",
    name: "First Republic",
  },
  {
    domain: "santanderbank.com",
    id: "plaid-default:santander",
    name: "Santander",
  },
  { domain: "amerisbank.com", id: "plaid-default:ameris", name: "Ameris Bank" },
  { domain: "comerica.com", id: "plaid-default:comerica", name: "Comerica" },
  { domain: "zionsbank.com", id: "plaid-default:zions", name: "Zions Bank" },
  {
    domain: "firsthorizon.com",
    id: "plaid-default:first-horizon",
    name: "First Horizon",
  },
  { domain: "bbvausa.com", id: "plaid-default:bbva", name: "BBVA" },
  {
    domain: "synchronybank.com",
    id: "plaid-default:synchrony-bank",
    name: "Synchrony Bank",
  },
  { domain: "cit.com", id: "plaid-default:cit", name: "CIT Bank" },
  { domain: "axosbank.com", id: "plaid-default:axos", name: "Axos Bank" },
  { domain: "penfed.org", id: "plaid-default:penfed", name: "PenFed" },
  {
    domain: "alliantcreditunion.org",
    id: "plaid-default:alliant",
    name: "Alliant",
  },
  {
    domain: "schoolsfirstfcu.org",
    id: "plaid-default:schoolsfirst",
    name: "SchoolsFirst FCU",
  },
  {
    domain: "firsttechfed.com",
    id: "plaid-default:first-tech",
    name: "First Tech FCU",
  },
  {
    domain: "bankofthewest.com",
    id: "plaid-default:bank-of-west",
    name: "Bank of the West",
  },
  {
    domain: "websterbank.com",
    id: "plaid-default:webster",
    name: "Webster Bank",
  },
  {
    domain: "cnb.com",
    id: "plaid-default:city-national",
    name: "City National",
  },
  {
    domain: "peoples.com",
    id: "plaid-default:peoples-united",
    name: "People's United",
  },
];

const PLAID_CREDIT_SEEDS: readonly PlaidSeed[] = [
  {
    domain: "americanexpress.com",
    id: "plaid-default:amex",
    name: "American Express",
  },
  { domain: "chase.com", id: "plaid-default:chase-credit", name: "Chase" },
  {
    domain: "capitalone.com",
    id: "plaid-default:capital-one-credit",
    name: "Capital One",
  },
  { domain: "citi.com", id: "plaid-default:citi-credit", name: "Citi" },
  { domain: "discover.com", id: "plaid-default:discover", name: "Discover" },
  { domain: "apple.com", id: "plaid-default:apple-card", name: "Apple Card" },
  {
    domain: "bankofamerica.com",
    id: "plaid-default:bofa-credit",
    name: "Bank of America",
  },
  {
    domain: "wellsfargo.com",
    id: "plaid-default:wells-fargo-credit",
    name: "Wells Fargo",
  },
  {
    domain: "barclaycardus.com",
    id: "plaid-default:barclays",
    name: "Barclays",
  },
  { domain: "synchrony.com", id: "plaid-default:synchrony", name: "Synchrony" },
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
