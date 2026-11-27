"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { partnersApi } from "../api/partnersApi";
import type { PartnerChannelOption, PartnerCode, PartnerCodePayload } from "../types";

const CHANNEL_FALLBACK: PartnerChannelOption[] = [
  { value: "TIKTOK",    label: "TikTok" },
  { value: "YOUTUBE",   label: "YouTube" },
  { value: "FACEBOOK",  label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TELEGRAM",  label: "Telegram" },
  { value: "TWITTER",   label: "Twitter / X" },
  { value: "LINKEDIN",  label: "LinkedIn" },
  { value: "OTHER",     label: "Other" },
];

const CODE_REGEX = /^[A-Z0-9]{3,20}$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PartnerCode | null;
  onSubmit: (payload: PartnerCodePayload) => Promise<void>;
}

export function PartnerFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [channels, setChannels] = useState<PartnerChannelOption[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("");
  const [note, setNote] = useState("");
  const [customCode, setCustomCode] = useState(false);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChannelsLoading(true);
    partnersApi
      .listChannels()
      .then(setChannels)
      .catch(() => setChannels(CHANNEL_FALLBACK))
      .finally(() => setChannelsLoading(false));
  }, [open]);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPhone(initial?.phone ?? "");
      setChannel(initial?.channel ?? "");
      setNote(initial?.note ?? "");
      setCustomCode(false);
      setCode("");
      setError(null);
    }
  }, [open, initial]);

  function handleCodeInput(raw: string) {
    setCode(raw.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  }

  function validate(): string | null {
    if (customCode && code && !CODE_REGEX.test(code)) {
      return "Code must be 3–20 uppercase letters and digits only.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name,
        phone: phone || null,
        channel: channel || null,
        note: note || null,
        ...(customCode && code ? { code } : {}),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isEditing = !!initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Creator" : "Add Creator"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="partner-name">Name</Label>
            <Input
              id="partner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dara Influencer"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partner-phone">Phone (optional)</Label>
            <Input
              id="partner-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0961234567"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Channel (optional)</Label>
            <Select
              value={channel}
              onValueChange={setChannel}
              disabled={channelsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={channelsLoading ? "Loading…" : "Select a channel"} />
              </SelectTrigger>
              <SelectContent>
                {channels.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partner-note">Note (optional)</Label>
            <Input
              id="partner-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="50k followers, fintech niche"
            />
          </div>

          {/* Code — only shown when creating */}
          {!isEditing && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Referral Code</Label>
                <div className="flex rounded-md border border-border text-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setCustomCode(false); setCode(""); }}
                    className={`px-3 py-1 transition-colors ${!customCode ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    Auto-generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomCode(true)}
                    className={`px-3 py-1 transition-colors ${customCode ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {customCode ? (
                <>
                  <Input
                    value={code}
                    onChange={(e) => handleCodeInput(e.target.value)}
                    placeholder="DARA2026"
                    maxLength={20}
                    className="font-mono tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground">
                    3–20 characters. Uppercase letters and digits only. Must be unique.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A unique code will be auto-generated and shown after creation.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-md bg-status-danger-bg px-3 py-2 text-xs text-status-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={saving || !name.trim() || (customCode && !!code && !CODE_REGEX.test(code))}
            >
              {saving ? "Saving…" : isEditing ? "Update" : "Add Creator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
