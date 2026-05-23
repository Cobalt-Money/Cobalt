import { z } from "zod";

import { TAG_COLORS } from "../../../../tag-palette";

export const tagColorSchema = z.enum(TAG_COLORS);

export const tagNameSchema = z.string().trim().min(1).max(50);
