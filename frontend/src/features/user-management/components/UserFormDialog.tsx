"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { AdminUser, AdminUserPayload, StaffRole } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AdminUser | null;
  roles: StaffRole[];
  onSubmit: (payload: AdminUserPayload) => Promise<void>;
}

export function UserFormDialog({ open, onOpenChange, initial, roles, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffRoleId, setStaffRoleId] = useState<string>("super");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setEmail(initial?.email ?? "");
      setPassword("");
      setStaffRoleId(initial?.staffRoleId ? String(initial.staffRoleId) : "super");
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: AdminUserPayload = {
        name,
        email,
        staffRoleId: staffRoleId === "super" ? null : Number(staffRoleId),
      };
      if (password) payload.password = password;
      await onSubmit(payload);
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
          <DialogTitle>{initial ? "Edit Admin User" : "Create Admin User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Name</Label>
            <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sokha Lim" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="sokha@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-password">{initial ? "New Password (leave blank to keep)" : "Password"}</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!initial}
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={staffRoleId} onValueChange={setStaffRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super">Super Admin (full access)</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="rounded-md bg-status-danger-bg px-3 py-2 text-xs text-status-danger">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? "Saving…" : initial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
