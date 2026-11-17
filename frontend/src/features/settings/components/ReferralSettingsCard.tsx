"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settingsApi } from "../api/settingsApi";

export function ReferralSettingsCard() {
  const [bonus, setBonus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getReferral()
      .then((data) => setBonus(String(data.refereeBonus)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await settingsApi.updateReferral({ refereeBonus: Number(bonus) });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Referral Settings</CardTitle>
        <CardDescription>
          Points automatically awarded to a new customer when they apply a referral code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="referee-bonus">Referee Bonus Points</Label>
            <div className="flex items-center gap-2">
              <Input
                id="referee-bonus"
                type="number"
                min="0"
                value={bonus}
                onChange={(e) => { setBonus(e.target.value); setSuccess(false); }}
                disabled={loading}
                className="w-40"
                required
              />
              <span className="text-sm text-muted-foreground">pts</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Awarded once when a new customer first applies a valid referral code.
            </p>
          </div>

          {success && (
            <p className="rounded-md bg-status-success-bg px-3 py-2 text-xs text-status-success">
              Settings saved successfully.
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
