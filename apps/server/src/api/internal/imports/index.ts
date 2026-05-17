import { OpenAPIHono } from "@hono/zod-openapi";

import { importsAccountMapRouter } from "./account-map.js";
import { importsCancelRouter } from "./cancel.js";
import { importsCategoryMapRouter } from "./category-map.js";
import { importsColumnMapRouter } from "./column-map.js";
import { importsCommitRouter } from "./commit.js";
import { importsDeleteRouter } from "./delete.js";
import { importsListRouter } from "./list.js";
import { importsResolutionsRouter } from "./resolutions.js";
import { importsStagedPreviewRouter } from "./staged-preview.js";
import { importsStagedRowsRouter } from "./staged-rows.js";
import { importsStatusRouter } from "./status.js";
import { importsUploadRouter } from "./upload.js";

// /list must mount before /{id} so the literal route wins over the param.
// Delete by id is also a sibling of /{id} GET — mount order is preserved.
export const importsRouter = new OpenAPIHono()
  .route("/", importsListRouter)
  .route("/", importsUploadRouter)
  .route("/", importsColumnMapRouter)
  .route("/", importsAccountMapRouter)
  .route("/", importsCategoryMapRouter)
  .route("/", importsStagedPreviewRouter)
  .route("/", importsStagedRowsRouter)
  .route("/", importsResolutionsRouter)
  .route("/", importsCommitRouter)
  .route("/", importsCancelRouter)
  .route("/", importsDeleteRouter)
  .route("/", importsStatusRouter);
