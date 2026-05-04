import { Shimmer } from "@cobalt-web/ui/components/ai-elements/shimmer";
import { BlobProvider, Document } from "@react-pdf/renderer";
import { memo, useMemo } from "react";

interface PDFDownloadLinkProps {
  children: React.ReactNode;
  title?: string;
}

export const PDFDownloadLink = memo(function PDFDownloadLink({
  children,
  title = "Document",
}: PDFDownloadLinkProps) {
  const doc = useMemo(() => <Document title={title}>{children}</Document>, [children, title]);

  return (
    <BlobProvider document={doc}>
      {({ url, loading, error }) => {
        if (loading) {
          return <Shimmer className="text-sm">Cooking up the PDF</Shimmer>;
        }

        if (error) {
          return <span className="text-sm text-destructive">Failed to generate PDF</span>;
        }

        return (
          <a
            className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            download={`${title}.pdf`}
            href={url ?? undefined}
          >
            {title}.pdf
          </a>
        );
      }}
    </BlobProvider>
  );
});
