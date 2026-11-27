"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { partnersApi } from "../api/partnersApi";
import type { PartnerDetail } from "../types";

const CONVERSION_VARIANT: Record<string, "info" | "success"> = {
  APPLICATION_SUBMISSION: "info",
  LOAN_APPROVAL: "success",
};

const CONVERSION_LABEL: Record<string, string> = {
  APPLICATION_SUBMISSION: "Applied",
  LOAN_APPROVAL: "Approved",
};

interface Props {
  partnerId: number | null;
  onClose: () => void;
}

export function PartnerUsagesDialog({ partnerId, onClose }: Props) {
  const [detail, setDetail] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    setDetail(null);
    setError(null);
    partnersApi
      .getUsages(partnerId)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load usages"))
      .finally(() => setLoading(false));
  }, [partnerId]);

  return (
    <Dialog open={!!partnerId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {detail ? `${detail.name} — Usages` : "Creator Usages"}
          </DialogTitle>
          {detail && (
            <div className="flex items-center gap-4 pt-1 text-sm text-muted-foreground">
              <span>
                Code:{" "}
                <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                  {detail.code}
                </code>
              </span>
              {detail.channel && <span>{detail.channel}</span>}
              <span>
                <span className="font-semibold text-foreground">{detail.usages.length}</span> usages ·{" "}
                <span className="font-semibold text-foreground">
                  {detail.usages.filter((u) => u.conversions.length > 0).length}
                </span> conversions
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="overflow-y-auto mt-2">
          {error && <p className="px-2 py-4 text-sm text-status-danger">{error}</p>}

          {loading ? (
            <table className="w-full text-sm">
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : detail?.usages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Users className="h-6 w-6" />
              <p className="text-sm">No one has used this code yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {detail?.usages.map((u) => (
                  <tr key={u.customerId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{u.customerName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {u.conversions.length === 0 ? (
                        <span className="text-xs text-muted-foreground">None yet</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.conversions.map((c) => (
                            <Badge key={c} variant={CONVERSION_VARIANT[c] ?? "secondary"}>
                              {CONVERSION_LABEL[c] ?? c}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
