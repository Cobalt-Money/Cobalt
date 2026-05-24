import { createApp } from "../../../../lib/create-app.js";
import { detailRouter } from "./detail.js";
import { listRouter } from "./list.js";

export const accountsRouter = createApp().route("/", listRouter).route("/", detailRouter);
