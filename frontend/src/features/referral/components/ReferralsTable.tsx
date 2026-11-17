"use client";

import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReferrals } from "../hooks/useReferrals";

const TIER_VARIANT: Record<string, "new" | "info" | "success" | "warning" | "secondary"> = {
  BRONZE:   "secondary",
  SILVER:   "info",
  GOLD:     "warning",
  PLATINUM: "success",
  DIAMOND:  "new",
};

export function ReferralsTable() {
  const { referrals, loading, error } = useReferrals();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Referral Relationships</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Referrer</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Referee</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Code Used</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Linked At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <GitBranch className="h-6 w-6" />
                      <p className="text-sm">No referral relationships yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                referrals.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    {/* Referrer */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{r.referrer.name}</div>
                      <div className="text-xs text-muted-foreground">{r.referrer.phone}</div>
                      <Badge
                        variant={TIER_VARIANT[r.referrer.tier] ?? "secondary"}
                        className="mt-1"
                      >
                        {r.referrer.tier}
                      </Badge>
                    </td>
                    {/* Referee */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{r.referee.name}</div>
                      <div className="text-xs text-muted-foreground">{r.referee.phone}</div>
                      <Badge
                        variant={TIER_VARIANT[r.referee.tier] ?? "secondary"}
                        className="mt-1"
                      >
                        {r.referee.tier}
                      </Badge>
                    </td>
                    {/* Code */}
                    <td className="px-6 py-4">
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                        {r.codeUsed}
                      </code>
                    </td>
                    {/* Linked At */}
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(r.linkedAt).toLocaleDateString()}{" "}
                      <span className="text-xs">
                        {new Date(r.linkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
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
