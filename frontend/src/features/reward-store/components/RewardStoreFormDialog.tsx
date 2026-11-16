"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import type { RewardItem, RewardItemPayload } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: RewardItem | null;
  onSubmit: (payload: RewardItemPayload) => Promise<void>;
}

export function RewardStoreFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("100");
  const [imageUrl, setImageUrl] = useState("");
  const [stock, setStock] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setPoints(String(initial?.points ?? 100));
      setImageUrl(initial?.imageUrl ?? "");
      setStock(String(initial?.stock ?? 0));
      setIsActive(initial?.isActive ?? true);
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title,
        points: Number(points),
        imageUrl: imageUrl || undefined,
        stock: Number(stock),
        isActive,
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
          <DialogTitle>{initial ? "Edit Reward Item" : "Create Reward Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="reward-title">Title</Label>
            <Input
              id="reward-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Polo Shirt"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reward-points">Points Cost</Label>
              <Input
                id="reward-points"
                type="number"
                min="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reward-stock">Stock</Label>
              <Input
                id="reward-stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Image (optional)</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="reward-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-brand"
            />
            <Label htmlFor="reward-active">Active (visible to customers)</Label>
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
