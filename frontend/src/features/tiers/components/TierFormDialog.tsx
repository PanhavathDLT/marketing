"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import type { Tier, TierPayload } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Tier | null;
  onSubmit: (payload: TierPayload) => Promise<void>;
}

export function TierFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [minPoints, setMinPoints] = useState("0");
  const [iconUrl, setIconUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMinPoints(String(initial?.minPoints ?? 0));
      setIconUrl(initial?.iconUrl ?? "");
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name,
        minPoints: Number(minPoints),
        iconUrl: iconUrl || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Tier" : "Create Tier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tier-name">Name</Label>
            <Input
              id="tier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GOLD"
              required
            />
            <p className="text-xs text-muted-foreground">Automatically uppercased. Must be unique.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tier-points">Minimum Points</Label>
            <Input
              id="tier-points"
              type="number"
              min="0"
              value={minPoints}
              onChange={(e) => setMinPoints(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Icon (optional)</Label>
            <ImageUpload value={iconUrl} onChange={setIconUrl} />
          </div>
          {error && (
            <p className="rounded-md bg-status-danger-bg px-3 py-2 text-xs text-status-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? "Saving…" : initial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
