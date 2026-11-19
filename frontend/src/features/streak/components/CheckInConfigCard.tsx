"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { streakApi } from "../api/streakApi";

export function CheckInConfigCard() {
  const [points, setPoints] = useState<string[]>(Array(7).fill("0"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    streakApi
      .getConfig()
      .then((data) => setPoints(data.points.map(String)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(index: number, value: string) {
    setSuccess(false);
    setPoints((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await streakApi.updateConfig({ points: points.map(Number) });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Daily Check-in Points</CardTitle>
        <CardDescription>
          Points awarded to customers for each consecutive day of their 7-day streak cycle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-7 gap-3">
            {points.map((value, i) => (
              <div key={i} className="space-y-1.5">
                <Label htmlFor={`day-${i + 1}`} className="text-xs text-center block">
                  Day {i + 1}
                </Label>
                <Input
                  id={`day-${i + 1}`}
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => handleChange(i, e.target.value)}
                  disabled={loading}
                  className="text-center px-2"
                  required
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Day 7 is typically the bonus day. All values must be non-negative integers.
          </p>

          {success && (
            <p className="rounded-md bg-status-success-bg px-3 py-2 text-xs text-status-success">
              Check-in config saved successfully.
            </p>
          )}
          {error && (
            <p className="rounded-md bg-status-danger-bg px-3 py-2 text-xs text-status-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="brand" disabled={loading || saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
