"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { missionsApi } from "../api/missionsApi";
import type { Mission, MissionPayload, MissionTypeOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Mission | null;
  onSubmit: (payload: MissionPayload) => Promise<void>;
}

function toDateInput(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function startOfDay(date: string): string {
  return new Date(date + "T00:00:00").toISOString();
}

function endOfDay(date: string): string {
  return new Date(date + "T23:59:59").toISOString();
}

export function MissionFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [missionTypes, setMissionTypes] = useState<MissionTypeOption[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [points, setPoints] = useState("100");
  const [requiredCount, setRequiredCount] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch mission types when dialog opens
  useEffect(() => {
    if (!open) return;
    setTypesLoading(true);
    missionsApi.listTypes()
      .then((types) => {
        setMissionTypes(types);
        // Set default type to first option or keep existing
        if (!initial?.type && types.length > 0) {
          setType(types[0].value);
        }
      })
      .catch(() => {
        // Fall back to common types if endpoint fails
        const fallback: MissionTypeOption[] = [
          { value: "REFERRAL",         label: "Referral" },
          { value: "LOAN_APPLICATION", label: "Loan Application" },
          { value: "LOAN_APPROVAL",    label: "Loan Approval" },
          { value: "REPAYMENT",        label: "Repayment" },
        ];
        setMissionTypes(fallback);
        if (!initial?.type) setType(fallback[0].value);
      })
      .finally(() => setTypesLoading(false));
  }, [open, initial?.type]);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setType(initial?.type ?? "");
      setPoints(String(initial?.points ?? 100));
      setRequiredCount(String(initial?.requiredCount ?? 1));
      setStartDate(toDateInput(initial?.startDate));
      setEndDate(toDateInput(initial?.endDate));
      setIconUrl(initial?.iconUrl ?? "");
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Start date and end date are required.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError("End date must be after start date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title,
        type,
        points: Number(points),
        requiredCount: Number(requiredCount),
        startDate: startOfDay(startDate),
        endDate: endOfDay(endDate),
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
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Mission" : "Create Mission"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto py-2 pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="mission-title">Title</Label>
            <Input
              id="mission-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Invite 3 Friends"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType} disabled={typesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={typesLoading ? "Loading…" : "Select type"} />
              </SelectTrigger>
              <SelectContent>
                {missionTypes.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="points">Points Reward</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="required-count">Required Count</Label>
              <Input
                id="required-count"
                type="number"
                min="1"
                value={requiredCount}
                onChange={(e) => setRequiredCount(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Events needed before the mission becomes claimable (e.g. 3 = make 3 repayments)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
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

          <DialogFooter className="pt-2 border-t border-border mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={saving || !type}>
              {saving ? "Saving…" : initial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
