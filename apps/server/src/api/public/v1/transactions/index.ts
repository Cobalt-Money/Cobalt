import { createApp } from "../../../../lib/create-app.js";
import { detailRouter } from "./detail.js";
import { listRouter } from "./list.js";
import { setTagsRouter } from "./set-tags.js";

export const transactionsRouter = createApp()
  .route("/", listRouter)
  .route("/", detailRouter)
  .route("/", setTagsRouter);
