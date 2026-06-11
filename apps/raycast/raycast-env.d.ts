/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API URL - Cobalt API base URL */
  "apiUrl": string,
  /** API Key - Optional. Paste a Cobalt API key (prefix ck_live_) from Settings → API keys to skip OAuth sign-in. */
  "apiKey"?: string,
  /** Brandfetch Client ID - Optional. Provide your own Brandfetch client ID to render merchant logos via the Brandfetch CDN. Leave blank to fall back to generic icons. */
  "brandfetchClientId"?: string,
  /** Logo.dev Publishable Token - Used for recurring/subscription brand logos via logo.dev (matches web) */
  "logoDevToken"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `transactions` command */
  export type Transactions = ExtensionPreferences & {}
  /** Preferences accessible in the `recurring` command */
  export type Recurring = ExtensionPreferences & {}
  /** Preferences accessible in the `accounts` command */
  export type Accounts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `transactions` command */
  export type Transactions = {}
  /** Arguments passed to the `recurring` command */
  export type Recurring = {}
  /** Arguments passed to the `accounts` command */
  export type Accounts = {}
}

