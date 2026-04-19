import { createContext, useContext } from "react";

export type MaskChar = "•" | "*";

export interface MaskOptions {
  char?: MaskChar;
  length?: number;
}

export interface PrivacyContextValue {
  hidden: boolean;
  setHidden: (value: boolean) => void;
  toggle: () => void;
  mask: (value: string, options?: MaskOptions) => string;
}

export const PRIVACY_STORAGE_KEY = "cobalt:privacy-hidden";
export const DEFAULT_MASK_CHAR: MaskChar = "•";
export const DEFAULT_MASK_LENGTH = 6;

const NOOP_PRIVACY: PrivacyContextValue = {
  hidden: false,
  mask: (value) => value,
  setHidden: () => {
    // no-op when no provider is mounted
  },
  toggle: () => {
    // no-op when no provider is mounted
  },
};

export const PrivacyContext = createContext<PrivacyContextValue>(NOOP_PRIVACY);

export function usePrivacy(): PrivacyContextValue {
  return useContext(PrivacyContext);
}
