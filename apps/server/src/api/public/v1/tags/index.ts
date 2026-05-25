import { createApp } from "../../../../lib/create-app.js";
import { bulkApplyRouter } from "./bulk-apply.js";
import { detailRouter } from "./detail.js";
import { listRouter } from "./list.js";

export const tagsRouter = createApp()
  .route("/", listRouter)
  .route("/", bulkApplyRouter)
  .route("/", detailRouter);
