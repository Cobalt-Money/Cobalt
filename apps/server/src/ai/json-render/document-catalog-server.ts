import { defineCatalog, defineSchema } from "@json-render/core";
import { z } from "zod";

const documentSchema = defineSchema((s) => ({
  catalog: s.object({
    actions: s.map({
      description: s.string(),
      params: s.zod(),
    }),
    components: s.map({
      description: s.string(),
      props: s.zod(),
    }),
  }),
  spec: s.object({
    elements: s.record(
      s.object({
        children: s.array(s.string()),
        props: s.propsOf("catalog.components"),
        type: s.ref("catalog.components"),
        visible: s.any(),
      }),
    ),
    root: s.string(),
  }),
}));

const documentComponentProps = {
  PDFCallout: z.object({
    text: z.string(),
    variant: z.enum(["info", "warning", "success"]).default("info"),
  }),
  PDFColumn: z.object({
    width: z.string().optional(),
  }),
  PDFColumns: z.object({
    gap: z.number().optional().default(12),
  }),
  PDFDivider: z.object({
    color: z.string().optional(),
  }),
  PDFFooter: z.object({
    showPageNumbers: z.boolean().optional().default(true),
    text: z.string().optional(),
  }),
  PDFHeader: z.object({
    date: z.string().optional(),
    subtitle: z.string().optional(),
    title: z.string(),
  }),
  PDFHeading: z.object({
    level: z.number().min(1).max(3).default(1),
    text: z.string(),
  }),
  PDFList: z.object({
    items: z.array(z.string()),
    ordered: z.boolean().optional().default(false),
  }),
  PDFMetricRow: z.object({
    metrics: z.array(
      z.object({
        change: z.string().optional(),
        changeType: z.enum(["positive", "negative", "neutral"]).optional(),
        label: z.string(),
        value: z.string(),
      }),
    ),
  }),
  PDFPage: z.object({
    orientation: z.enum(["portrait", "landscape"]).optional().default("portrait"),
    size: z.enum(["A4", "LETTER", "LEGAL"]).optional().default("LETTER"),
  }),
  PDFSection: z.object({
    title: z.string().optional(),
  }),
  PDFTable: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.array(z.union([z.string(), z.number()]))),
    striped: z.boolean().optional().default(true),
  }),
  PDFText: z.object({
    align: z.enum(["left", "center", "right"]).optional(),
    bold: z.boolean().optional(),
    color: z.string().optional(),
    content: z.string(),
    fontSize: z.number().optional(),
    italic: z.boolean().optional(),
  }),
};

export const documentCatalogServer = defineCatalog(documentSchema, {
  actions: {},
  components: {
    PDFCallout: {
      description:
        "A highlighted callout box. Variants: info (blue), warning (amber), success (green). Use for important notes, disclaimers, or alerts.",
      props: documentComponentProps.PDFCallout,
    },
    PDFColumn: {
      description:
        "A single column within a PDFColumns layout. Set width as a percentage (e.g. '50%') or leave empty for equal distribution.",
      props: documentComponentProps.PDFColumn,
    },
    PDFColumns: {
      description: "A multi-column layout container. Children should be PDFColumn elements.",
      props: documentComponentProps.PDFColumns,
    },
    PDFDivider: {
      description: "A horizontal line separator. Use between sections.",
      props: documentComponentProps.PDFDivider,
    },
    PDFFooter: {
      description:
        "Page footer with optional text and page numbers. Use for disclaimers, dates, or branding.",
      props: documentComponentProps.PDFFooter,
    },
    PDFHeader: {
      description:
        "Document header block with title, optional subtitle, and optional date. Place at the top of a PDFPage.",
      props: documentComponentProps.PDFHeader,
    },
    PDFHeading: {
      description: "A section heading. Level 1 is the largest, level 3 is the smallest.",
      props: documentComponentProps.PDFHeading,
    },
    PDFList: {
      description: "A bulleted or numbered list.",
      props: documentComponentProps.PDFList,
    },
    PDFMetricRow: {
      description:
        "A row of metric/KPI cards displayed side by side. Use for financial summaries like total income, expenses, net savings.",
      props: documentComponentProps.PDFMetricRow,
    },
    PDFPage: {
      description:
        "A page in the PDF document. Use as the root element. All other components must be children of a PDFPage.",
      props: documentComponentProps.PDFPage,
    },
    PDFSection: {
      description:
        "A grouping container with optional title heading. Use to organize related content within a page.",
      props: documentComponentProps.PDFSection,
    },
    PDFTable: {
      description:
        "A data table with column headers and rows. Use for transaction lists, account summaries, and tabular data.",
      props: documentComponentProps.PDFTable,
    },
    PDFText: {
      description: "A text paragraph. Supports font size, bold, italic, color, and alignment.",
      props: documentComponentProps.PDFText,
    },
  },
});
