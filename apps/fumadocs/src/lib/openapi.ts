import { createOpenAPI } from "fumadocs-openapi/server";

export const openapiInput = [
  process.env.OPENAPI_URL ?? "../server/openapi.json",
];

export const openapi = createOpenAPI({
  input: openapiInput,
});
