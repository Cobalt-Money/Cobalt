export { ApiError } from "../../_shared/api-error.js";

export type CategoryMutationErrorCode =
  | "not_found"
  | "system_locked"
  | "group_not_found"
  | "group_has_categories"
  | "uncategorized_missing"
  | "name_conflict"
  | "reassign_target_invalid";

export class CategoryMutationError extends Error {
  readonly code: CategoryMutationErrorCode;

  constructor(code: CategoryMutationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CategoryMutationError";
  }
}
