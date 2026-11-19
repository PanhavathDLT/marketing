"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { streakApi, type CheckInCustomer } from "../api/streakApi";

const TIER_VARIANT: Record<string, "new" | "info" | "success" | "warning" | "secondary"> = {
  BRONZE:   "secondary",
  SILVER:   "info",
  GOLD:     "warning",
  PLATINUM: "success",
  DIAMOND:  "new",
};

export function CheckInCustomersTable() {
  const [customers, setCustomers] = useState<CheckInCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    streakApi
      .listCustomers()
      .then(setCustomers)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer Check-ins</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Tier</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Points</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Streak Day</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Last Check-in</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Total Check-ins</th>
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Flame className="h-6 w-6" />
                      <p className="text-sm">No check-ins recorded yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customerId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{c.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={TIER_VARIANT[c.tier] ?? "secondary"}>{c.tier}</Badge>
                    </td>
                    <td className="px-6 py-4 font-semibold text-brand">
                      {c.points.toLocaleString()} pts
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-orange-400" />
                        <span className="font-medium text-foreground">Day {c.currentStreakDay}</span>
                        <span className="text-muted-foreground">/ 7</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(c.lastCheckInDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.totalCheckIns}
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
