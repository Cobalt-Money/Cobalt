import { Button } from "@cobalt-web/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cobalt-web/ui/components/card";
import { Input } from "@cobalt-web/ui/components/input";
import { Label } from "@cobalt-web/ui/components/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { importsBaseUrl } from "@/lib/clients/api-client";

export const Route = createFileRoute("/_auth/imports/")({
  component: ImportsUploadPage,
  staticData: { title: "Import transactions" },
});

function ImportsUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(importsBaseUrl, {
        body: form,
        credentials: "include",
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Upload failed (${String(res.status)})`);
      }
      const data = (await res.json()) as { id: string };
      navigate({ params: { jobId: data.id }, to: "/imports/$jobId" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-10">
      <Card>
        <CardHeader>
          <CardTitle>Import transactions</CardTitle>
          <CardDescription>
            Upload a Mint CSV export. We&apos;ll parse it, let you map source accounts to your
            Cobalt accounts, then commit non-duplicate rows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="import-file">CSV file</Label>
              <Input
                accept=".csv,text/csv"
                disabled={busy}
                id="import-file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                type="file"
              />
              <p className="text-muted-foreground text-xs">Max 5 MB. Mint format only.</p>
            </div>
            <div className="flex justify-end">
              <Button disabled={!file || busy} type="submit">
                {busy ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
