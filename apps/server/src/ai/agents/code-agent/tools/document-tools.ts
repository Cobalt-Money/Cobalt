import { tool } from "ai";
import type { UIToolInvocation } from "ai";
import { z } from "zod";

export const renderDocumentTool = tool({
  description:
    "Render a PDF document for download. Use this after fetching data to create financial reports, statements, summaries, or any document the user wants to export or download. The spec should use the available PDF components: PDFPage, PDFHeader, PDFText, PDFHeading, PDFTable, PDFMetricRow, PDFSection, PDFColumns, PDFColumn, PDFDivider, PDFList, PDFFooter, PDFCallout. Compose the document spec based on the data you've already fetched from other tools.",
  execute: ({ spec }) => spec,
  inputSchema: z.object({
    spec: z.object({
      elements: z
        .record(
          z.string(),
          z.object({
            children: z
              .array(z.string())
              .default([])
              .describe("Child element keys"),
            props: z
              .record(z.string(), z.unknown())
              .describe("Component props"),
            type: z
              .enum([
                "PDFPage",
                "PDFHeader",
                "PDFText",
                "PDFHeading",
                "PDFTable",
                "PDFMetricRow",
                "PDFSection",
                "PDFColumns",
                "PDFColumn",
                "PDFDivider",
                "PDFList",
                "PDFFooter",
                "PDFCallout",
              ])
              .describe("PDF component type"),
            visible: z
              .any()
              .optional()
              .describe("Visibility condition (optional)"),
          })
        )
        .describe("Map of element keys to element definitions"),
      root: z.string().describe("Root element key (e.g., 'page-1')"),
    }),
  }),
});

export type RenderDocumentToolInvocation = UIToolInvocation<
  typeof renderDocumentTool
>;
