import { createApp } from "../../../../lib/create-app.js";
import { createRouter } from "./create.js";
import { deleteRouter } from "./delete.js";
import { detailRouter } from "./detail.js";
import { listRouter } from "./list.js";

export const accountsRouter = createApp()
  .route("/", listRouter)
  .route("/", createRouter)
  .route("/", detailRouter)
  .route("/", deleteRouter);
