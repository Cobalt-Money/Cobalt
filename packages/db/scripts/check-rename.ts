import { Client } from "pg";

const url =
  process.env.LOCAL_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5433/cobalt";

const c = new Client({ connectionString: url });
await c.connect();

const pairs: [string, string][] = [
  ["archive.transaction", "public.transaction"],
  ["archive.recurring_stream", "public.recurring_stream"],
  ["archive.investment_activity", "public.investment_activity"],
  ["archive.credit_liability", "public.credit_liability"],
  ["archive.mortgage_liability", "public.mortgage_liability"],
  ["archive.student_loan_liability", "public.student_loan_liability"],
];

console.log("Row-count sanity check (archived old vs renamed new):\n");
for (const [oldT, newT] of pairs) {
  const o = await c.query(`SELECT count(*)::int as n FROM ${oldT}`);
  const n = await c.query(`SELECT count(*)::int as n FROM ${newT}`);
  console.log(`  ${oldT.padEnd(40)} ${o.rows[0].n}`);
  console.log(`  ${newT.padEnd(40)} ${n.rows[0].n}\n`);
}

await c.end();
