"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoles } from "../hooks/useRoles";
import { PermissionsMatrix } from "./PermissionsMatrix";
import type { PermissionGroup, RolePayload, StaffRole } from "../types";

interface Props {
  permissionGroups: PermissionGroup[];
}

export function RolesTable({ permissionGroups }: Props) {
  const { roles, loading, error, createRole, updateRole, deleteRole, setPermissions } = useRoles();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRole | null>(null);
  const [permTarget, setPermTarget] = useState<StaffRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setDescription("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(role: StaffRole) {
    setEditTarget(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload: RolePayload = { name, description: description || undefined };
      if (editTarget) {
        await updateRole(editTarget.id, payload);
      } else {
        await createRole(payload);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Roles</CardTitle>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Role
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Users</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Permissions</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      No roles yet.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{role.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{role.description ?? "—"}</td>
                      <td className="px-6 py-4 text-foreground">{role.userCount}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPermTarget(role)}>
                              <Settings2 className="h-4 w-4" />
                              Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(role)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-status-danger focus:text-status-danger"
                              onClick={() => setDeleteTarget(role)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit role dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="CONTENT_EDITOR" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">Description (optional)</Label>
              <Input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Can manage campaigns" />
            </div>
            {formError && (
              <p className="rounded-md bg-status-danger-bg px-3 py-2 text-xs text-status-danger">{formError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" variant="brand" disabled={saving}>
                {saving ? "Saving…" : editTarget ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete role dialog */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Delete <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>? This fails if users are still assigned.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Permissions matrix dialog */}
      {permTarget && (
        <PermissionsMatrix
          open={!!permTarget}
          onOpenChange={(o) => !o && setPermTarget(null)}
          role={permTarget}
          permissionGroups={permissionGroups}
          onSave={(ids) => setPermissions(permTarget.id, ids)}
        />
      )}
    </>
  );
}
