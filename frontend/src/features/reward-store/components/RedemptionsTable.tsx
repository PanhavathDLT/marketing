"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { useRedemptions } from "../hooks/useRedemptions";
import type { RedemptionStatus } from "../types";

const STATUS_LABELS: Record<RedemptionStatus, string> = {
  PENDING_PICKUP: "Pending Pickup",
  COLLECTED: "Collected",
  EXPIRED: "Expired",
};

const STATUS_VARIANTS: Record<RedemptionStatus, "warning" | "success" | "muted"> = {
  PENDING_PICKUP: "warning",
  COLLECTED: "success",
  EXPIRED: "muted",
};

const ALL_STATUSES: RedemptionStatus[] = ["PENDING_PICKUP", "COLLECTED", "EXPIRED"];

export function RedemptionsTable() {
  const { redemptions, loading, error, updateStatus } = useRedemptions();

  return (
    <Card>
      <CardContent className="p-0">
        {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Points</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Redeemed At</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : redemptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No redemptions yet.
                  </td>
                </tr>
              ) : (
                redemptions.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{r.customer.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.customer.phone ?? "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {r.rewardItem.imageUrl && (
                          <img
                            src={r.rewardItem.imageUrl}
                            alt={r.rewardItem.title}
                            className="h-8 w-8 rounded object-cover border border-border"
                          />
                        )}
                        <span>{r.rewardItem.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-brand">{r.points.toLocaleString()} pts</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(r.redeemedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_VARIANTS[r.status]}>
                        {STATUS_LABELS[r.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ALL_STATUSES.filter((s) => s !== r.status).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => updateStatus(r.id, s)}>
                              Mark as {STATUS_LABELS[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
