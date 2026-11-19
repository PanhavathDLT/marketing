"use client";

import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomers } from "../hooks/useCustomers";

const TIER_VARIANT: Record<string, "new" | "info" | "success" | "warning" | "secondary"> = {
  BRONZE:   "secondary",
  SILVER:   "info",
  GOLD:     "warning",
  PLATINUM: "success",
  DIAMOND:  "new",
};

export function CustomersTable() {
  const { customers, loading, error } = useCustomers();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Tier</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Loan Cycles</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Points</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Referral Code</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Referred By</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-6 w-6" />
                      <p className="text-sm">No customers yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {c.name ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{c.phone}</td>
                    <td className="px-6 py-4">
                      <Badge variant={TIER_VARIANT[c.tier] ?? "secondary"}>{c.tier}</Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.loanCycleCount}
                    </td>
                    <td className="px-6 py-4 font-semibold text-brand">
                      {c.points.toLocaleString()} pts
                    </td>
                    <td className="px-6 py-4">
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        {c.referralCode}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {c.referredBy ? (
                        <div>
                          <span className="text-foreground">{c.referredBy.name}</span>
                          <code className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                            {c.referredBy.referralCode}
                          </code>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(c.joinedAt).toLocaleDateString()}
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
