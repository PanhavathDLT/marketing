"use client";

import { useState } from "react";
import { GitBranch, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReferrals } from "../hooks/useReferrals";
import type { Referral } from "../types";

const TIER_VARIANT: Record<string, "new" | "info" | "success" | "warning" | "secondary"> = {
  BRONZE:   "secondary",
  SILVER:   "info",
  GOLD:     "warning",
  PLATINUM: "success",
  DIAMOND:  "new",
};

const PAGE_SIZE = 10;

interface GroupedReferrer {
  id: number;
  name: string;
  phone: string;
  tier: string;
  referralCode: string;
  referees: Referral[];
}

function groupByReferrer(referrals: Referral[]): GroupedReferrer[] {
  const map = new Map<number, GroupedReferrer>();
  for (const r of referrals) {
    const existing = map.get(r.referrer.id);
    if (existing) {
      existing.referees.push(r);
    } else {
      map.set(r.referrer.id, {
        id: r.referrer.id,
        name: r.referrer.name,
        phone: r.referrer.phone,
        tier: r.referrer.tier,
        referralCode: r.referrer.referralCode ?? r.codeUsed,
        referees: [r],
      });
    }
  }
  // Sort by most referees first
  return Array.from(map.values()).sort((a, b) => b.referees.length - a.referees.length);
}

export function ReferralsTable() {
  const { referrals, loading, error } = useReferrals();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const grouped = groupByReferrer(referrals);
  const totalReferrers = grouped.length;
  const totalReferees = referrals.length;
  const totalPages = Math.ceil(totalReferrers / PAGE_SIZE);
  const paginated = grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Referral Relationships</CardTitle>
        {!loading && referrals.length > 0 && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span><span className="font-semibold text-foreground">{totalReferrers}</span> referrers</span>
            <span><span className="font-semibold text-foreground">{totalReferees}</span> total referees</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 w-8" />
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Referrer</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Referral Code</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Tier</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Referees</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : grouped.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <GitBranch className="h-6 w-6" />
                      <p className="text-sm">No referral relationships yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.flatMap((referrer) => {
                  const isExpanded = expandedIds.has(referrer.id);
                  return [
                    // Referrer summary row
                    <tr
                      key={referrer.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(referrer.id)}
                    >
                      <td className="px-4 py-4 text-muted-foreground">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{referrer.name}</div>
                        <div className="text-xs text-muted-foreground">{referrer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                          {referrer.referralCode}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={TIER_VARIANT[referrer.tier] ?? "secondary"}>
                          {referrer.tier}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-brand">
                          {referrer.referees.length}
                          <span className="text-xs font-normal text-muted-foreground">
                            {referrer.referees.length === 1 ? "referee" : "referees"}
                          </span>
                        </span>
                      </td>
                    </tr>,

                    // Expanded referee rows
                    ...(isExpanded
                      ? referrer.referees.map((r, i) => (
                          <tr
                            key={`${referrer.id}-${i}`}
                            className="border-b border-border bg-muted/20 last:border-0"
                          >
                            <td className="px-4 py-3" />
                            <td className="px-6 py-3 pl-10" colSpan={2}>
                              <div className="font-medium text-foreground">{r.referee.name}</div>
                              <div className="text-xs text-muted-foreground">{r.referee.phone}</div>
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant={TIER_VARIANT[r.referee.tier] ?? "secondary"}>
                                {r.referee.tier}
                              </Badge>
                            </td>
                            <td className="px-6 py-3 text-xs text-muted-foreground">
                              {new Date(r.linkedAt).toLocaleDateString()}{" "}
                              {new Date(r.linkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        ))
                      : []),
                  ];
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
