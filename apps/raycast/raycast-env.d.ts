/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API URL - Cobalt API base URL */
  apiUrl: string;
  /** Brandfetch Client ID - Used to render merchant logos via the Brandfetch CDN */
  brandfetchClientId: string;
  /** Logo.dev Publishable Token - Used for recurring/subscription brand logos via logo.dev (matches web) */
  logoDevToken?: string;
};

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences;

declare namespace Preferences {
  /** Preferences accessible in the `transactions` command */
  export type Transactions = ExtensionPreferences & {};
  /** Preferences accessible in the `recurring` command */
  export type Recurring = ExtensionPreferences & {};
  /** Preferences accessible in the `accounts` command */
  export type Accounts = ExtensionPreferences & {};
  /** Preferences accessible in the `networth` command */
  export type Networth = ExtensionPreferences & {};
  /** Preferences accessible in the `menu-bar-networth` command */
  export type MenuBarNetworth = ExtensionPreferences & {};
}

declare namespace Arguments {
  /** Arguments passed to the `transactions` command */
  export type Transactions = {};
  /** Arguments passed to the `recurring` command */
  export type Recurring = {};
  /** Arguments passed to the `accounts` command */
  export type Accounts = {};
  /** Arguments passed to the `networth` command */
  export type Networth = {};
  /** Arguments passed to the `menu-bar-networth` command */
  export type MenuBarNetworth = {};
}
