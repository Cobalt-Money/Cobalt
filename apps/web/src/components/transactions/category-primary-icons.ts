import {
  Atm01Icon,
  BrushIcon,
  Car01Icon,
  CreditCardIcon,
  DollarCircleIcon,
  ElectricHome01Icon,
  Film01Icon,
  Hospital01Icon,
  LandmarkIcon,
  MoneyReceive01Icon,
  MoneySend01Icon,
  PlaneIcon,
  QuestionIcon,
  RepairIcon,
  Restaurant01Icon,
  ShoppingBag01Icon,
  ToolsIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

/** Plaid primary category → Hugeicons glyph (category column). */
export const PRIMARY_CATEGORY_ICON = {
  BANK_FEES: Atm01Icon,
  ENTERTAINMENT: Film01Icon,
  FOOD_AND_DRINK: Restaurant01Icon,
  GENERAL_MERCHANDISE: ShoppingBag01Icon,
  GENERAL_SERVICES: ToolsIcon,
  GOVERNMENT_AND_NON_PROFIT: LandmarkIcon,
  HOME_IMPROVEMENT: RepairIcon,
  INCOME: DollarCircleIcon,
  LOAN_PAYMENTS: CreditCardIcon,
  MEDICAL: Hospital01Icon,
  PERSONAL_CARE: BrushIcon,
  RENT_AND_UTILITIES: ElectricHome01Icon,
  TRANSFER_IN: MoneyReceive01Icon,
  TRANSFER_OUT: MoneySend01Icon,
  TRANSPORTATION: Car01Icon,
  TRAVEL: PlaneIcon,
} as const satisfies Record<string, IconSvgElement>;

export type PrimaryCategoryKey = keyof typeof PRIMARY_CATEGORY_ICON;

export const UNKNOWN_CATEGORY_ICON = QuestionIcon;
