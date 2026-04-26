import { pgEnum } from "drizzle-orm/pg-core";

export const accountSource = pgEnum("account_source", [
  "plaid",
  "snaptrade",
  "manual",
]);

export const transactionSource = pgEnum("transaction_source", [
  "plaid",
  "manual",
]);

export const activitySource = pgEnum("activity_source", [
  "plaid",
  "snaptrade",
  "manual",
]);

export const securitySource = pgEnum("security_source", [
  "plaid",
  "snaptrade",
  "manual",
]);
