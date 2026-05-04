import type { Spec } from "@json-render/core";
import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

const colors = {
  bgLight: "#f8f8fc",
  bgStripe: "#f0f0f8",
  border: "#e0e0e8",
  infoBg: "#eff6ff",
  infoBorder: "#3b82f6",
  muted: "#8888aa",
  negative: "#dc2626",
  positive: "#16a34a",
  primary: "#1a1a2e",
  secondary: "#4a4a6a",
  successBg: "#f0fdf4",
  successBorder: "#22c55e",
  warningBg: "#fffbeb",
  warningBorder: "#f59e0b",
};

const s = StyleSheet.create({
  callout: {
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 12,
    padding: 10,
  },
  calloutText: { fontSize: 10, lineHeight: 1.5 },
  column: { flex: 1 },
  columnsContainer: { flexDirection: "row" as const },
  divider: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 20,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    left: 40,
    paddingTop: 8,
    position: "absolute" as const,
    right: 40,
  },
  footerText: { color: colors.muted, fontSize: 8 },
  headerContainer: {
    borderBottomColor: colors.primary,
    borderBottomWidth: 2,
    marginBottom: 20,
    paddingBottom: 12,
  },
  headerDate: { color: colors.muted, fontSize: 10 },
  headerSubtitle: { color: colors.secondary, fontSize: 12, marginBottom: 2 },
  headerTitle: {
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    marginBottom: 4,
  },
  heading1: {
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    marginBottom: 8,
  },
  heading2: {
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginBottom: 6,
  },
  heading3: {
    color: colors.secondary,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginBottom: 4,
  },
  listBullet: { color: colors.secondary, fontSize: 10, width: 16 },
  listItem: { flexDirection: "row" as const, marginBottom: 4 },
  listText: {
    color: colors.primary,
    flex: 1,
    fontSize: 10,
    lineHeight: 1.5,
  },
  metricCard: {
    backgroundColor: colors.bgLight,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  metricChange: { fontSize: 9 },
  metricLabel: {
    color: colors.muted,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: "uppercase" as const,
  },
  metricRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 12,
  },
  metricValue: {
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 2,
  },
  page: {
    backgroundColor: "#ffffff",
    color: colors.primary,
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginBottom: 8,
    paddingBottom: 4,
  },
  tableCell: { color: colors.primary, flex: 1, fontSize: 9 },
  tableContainer: { marginBottom: 12 },
  tableHeader: {
    backgroundColor: colors.primary,
    flexDirection: "row" as const,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    color: "#ffffff",
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 0.5,
    flexDirection: "row" as const,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tableRowStriped: { backgroundColor: colors.bgStripe },
  text: {
    color: colors.primary,
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
  },
});

interface ElementDef {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  visible?: unknown;
}

type ComponentFn = (props: Record<string, unknown>, children: React.ReactNode) => React.ReactNode;

function getMetricColor(changeType: string | undefined): string {
  if (changeType === "positive") {
    return colors.positive;
  }
  if (changeType === "negative") {
    return colors.negative;
  }
  return colors.muted;
}

const componentMap: Record<string, ComponentFn> = {
  PDFCallout: (props) => {
    const { text: calloutText, variant = "info" } = props as {
      text: string;
      variant?: "info" | "warning" | "success";
    };
    const variantStyles = {
      info: {
        backgroundColor: colors.infoBg,
        borderLeftColor: colors.infoBorder,
        color: "#1e40af",
      },
      success: {
        backgroundColor: colors.successBg,
        borderLeftColor: colors.successBorder,
        color: "#166534",
      },
      warning: {
        backgroundColor: colors.warningBg,
        borderLeftColor: colors.warningBorder,
        color: "#92400e",
      },
    };
    const vs = variantStyles[variant];
    return (
      <View
        style={[
          s.callout,
          {
            backgroundColor: vs.backgroundColor,
            borderLeftColor: vs.borderLeftColor,
          },
        ]}
      >
        <Text style={[s.calloutText, { color: vs.color }]}>{calloutText}</Text>
      </View>
    );
  },

  PDFColumn: (props, children) => {
    const { width } = props as { width?: string };
    return (
      <View style={{ ...s.column, ...(width === undefined ? {} : { width }) }}>{children}</View>
    );
  },

  PDFColumns: (props, children) => {
    const { gap = 12 } = props as { gap?: number };
    return <View style={[s.columnsContainer, { gap }]}>{children}</View>;
  },

  PDFDivider: (props) => {
    const { color: dividerColor } = props as { color?: string };
    return (
      <View
        style={{
          ...s.divider,
          ...(dividerColor === undefined ? {} : { borderBottomColor: dividerColor }),
        }}
      />
    );
  },

  PDFFooter: (props) => {
    const { text: footerText, showPageNumbers = true } = props as {
      text?: string;
      showPageNumbers?: boolean;
    };
    return (
      <View fixed style={s.footer}>
        <Text style={s.footerText}>{footerText ?? ""}</Text>
        {showPageNumbers && (
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            style={s.footerText}
          />
        )}
      </View>
    );
  },

  PDFHeader: (props) => {
    const { title, subtitle, date } = props as {
      title: string;
      subtitle?: string;
      date?: string;
    };
    return (
      <View style={s.headerContainer}>
        <Text style={s.headerTitle}>{title}</Text>
        {subtitle && <Text style={s.headerSubtitle}>{subtitle}</Text>}
        {date && <Text style={s.headerDate}>{date}</Text>}
      </View>
    );
  },

  PDFHeading: (props) => {
    const { text, level = 1 } = props as { text: string; level?: number };
    let headingStyle = s.heading3;
    if (level === 1) {
      headingStyle = s.heading1;
    } else if (level === 2) {
      headingStyle = s.heading2;
    }
    return <Text style={headingStyle}>{text}</Text>;
  },

  PDFList: (props) => {
    const { items, ordered = false } = props as {
      items: string[];
      ordered?: boolean;
    };
    return (
      <View style={{ marginBottom: 8 }}>
        {items.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <View key={i} style={s.listItem}>
            <Text style={s.listBullet}>{ordered ? `${i + 1}.` : "\u2022"}</Text>
            <Text style={s.listText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  },

  PDFMetricRow: (props) => {
    const { metrics } = props as {
      metrics: {
        label: string;
        value: string;
        change?: string;
        changeType?: "positive" | "negative" | "neutral";
      }[];
    };
    return (
      <View style={s.metricRow}>
        {metrics.map((m, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <View key={i} style={s.metricCard}>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text style={s.metricValue}>{m.value}</Text>
            {m.change && (
              <Text
                style={[
                  s.metricChange,
                  {
                    color: getMetricColor(m.changeType),
                  },
                ]}
              >
                {m.change}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  },

  PDFPage: (props, children) => {
    const size = (props.size as string) ?? "LETTER";
    const orientation = (props.orientation as string) ?? "portrait";
    return (
      <Page
        orientation={orientation as "portrait" | "landscape"}
        size={size as "A4" | "LETTER" | "LEGAL"}
        style={s.page}
        wrap
      >
        {children}
      </Page>
    );
  },

  PDFSection: (props, children) => {
    const { title } = props as { title?: string };
    return (
      <View style={s.section}>
        {title && <Text style={s.sectionTitle}>{title}</Text>}
        {children}
      </View>
    );
  },

  PDFTable: (props) => {
    const {
      headers,
      rows,
      striped = true,
    } = props as {
      headers: string[];
      rows: (string | number)[][];
      striped?: boolean;
    };
    return (
      <View style={s.tableContainer}>
        <View style={s.tableHeader}>
          {headers.map((h, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Text key={i} style={s.tableHeaderCell}>
              {h}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIdx) => (
          <View
            // eslint-disable-next-line react/no-array-index-key
            key={rowIdx}
            style={
              striped && rowIdx % 2 === 1 ? { ...s.tableRow, ...s.tableRowStriped } : s.tableRow
            }
          >
            {row.map((cell, cellIdx) => (
              // eslint-disable-next-line react/no-array-index-key
              <Text key={cellIdx} style={s.tableCell}>
                {String(cell)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  },

  PDFText: (props) => {
    const { content, fontSize, bold, italic, color, align } = props as {
      content: string;
      fontSize?: number;
      bold?: boolean;
      italic?: boolean;
      color?: string;
      align?: "left" | "center" | "right";
    };
    const textStyle = {
      ...s.text,
      ...(fontSize === undefined ? {} : { fontSize }),
      ...(bold ? { fontFamily: "Helvetica-Bold" } : {}),
      ...(italic ? { fontFamily: "Helvetica-Oblique" } : {}),
      ...(color === undefined ? {} : { color }),
      ...(align === undefined ? {} : { textAlign: align }),
    };
    return <Text style={textStyle}>{content}</Text>;
  },
};

function renderElement(key: string, elements: Record<string, ElementDef>): React.ReactNode {
  const el = elements[key];
  if (!el) {
    return null;
  }

  const renderer = componentMap[el.type];
  if (!renderer) {
    return null;
  }

  const childNodes =
    el.children && el.children.length > 0
      ? el.children.map((childKey) => renderElement(childKey, elements))
      : null;

  return <React.Fragment key={key}>{renderer(el.props, childNodes)}</React.Fragment>;
}

export function buildPDFTree(spec: Spec): React.ReactNode {
  return renderElement(spec.root, spec.elements as Record<string, ElementDef>);
}
