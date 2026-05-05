import { z } from "zod";

export const categoryNameSchema = z.string().trim().min(1).max(50);

export const categoryIconKeySchema = z.string().trim().min(1).max(50);

export const categoryGroupNameSchema = z.string().trim().min(1).max(50);

export const categorySelectRefinements = {
  iconKey: categoryIconKeySchema,
  name: categoryNameSchema,
} as const;

export const categoryGroupSelectRefinements = {
  name: categoryGroupNameSchema,
} as const;
