"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PermissionGroup, StaffRole } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: StaffRole;
  permissionGroups: PermissionGroup[];
  onSave: (permissionIds: number[]) => Promise<unknown>;
}

export function PermissionsMatrix({ open, onOpenChange, role, permissionGroups, onSave }: Props) {
  const initial = new Set(role.permissions.map((p) => p.id));
  const [selected, setSelected] = useState<Set<number>>(new Set(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModule(group: PermissionGroup) {
    const ids = group.permissions.map((p) => p.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(Array.from(selected));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Permissions — <span className="text-brand">{role.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-4 py-2 pr-1">
          {permissionGroups.map((group) => {
            const ids = group.permissions.map((p) => p.id);
            const allSelected = ids.every((id) => selected.has(id));
            const someSelected = ids.some((id) => selected.has(id));

            return (
              <div key={group.module} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`module-${group.module}`}
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={() => toggleModule(group)}
                      className="h-4 w-4 rounded border-border accent-brand"
                    />
                    <label htmlFor={`module-${group.module}`} className="text-sm font-semibold text-foreground cursor-pointer">
                      {group.module}
                    </label>
                  </div>
                  <Badge variant="muted" className="text-xs">{ids.filter((id) => selected.has(id)).length}/{ids.length}</Badge>
                </div>
                <div className="ml-6 grid grid-cols-2 gap-2">
                  {group.permissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(perm.id)}
                        onChange={() => toggle(perm.id)}
                        className="h-3.5 w-3.5 rounded border-border accent-brand"
                      />
                      <span className="text-sm text-muted-foreground">{perm.action}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="rounded-md bg-status-danger-bg px-3 py-2 text-xs text-status-danger">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="brand" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
