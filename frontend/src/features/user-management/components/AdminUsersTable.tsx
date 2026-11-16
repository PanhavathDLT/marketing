"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Plus, ShieldCheck, Shield } from "lucide-react";
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
import { UserFormDialog } from "./UserFormDialog";
import { useAdminUsers } from "../hooks/useAdminUsers";
import type { AdminUser, AdminUserPayload, StaffRole } from "../types";

interface Props {
  roles: StaffRole[];
}

export function AdminUsersTable({ roles }: Props) {
  const { users, loading, error, createUser, updateUser, deleteUser } = useAdminUsers();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(payload: AdminUserPayload) {
    if (editTarget) {
      await updateUser(editTarget.id, payload);
    } else {
      await createUser(payload);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Admin Users</CardTitle>
          <Button variant="brand" size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            New User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      No admin users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.isSuperAdmin
                            ? <ShieldCheck className="h-4 w-4 text-brand shrink-0" />
                            : <Shield className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <span className="font-medium text-foreground">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        {user.isSuperAdmin
                          ? <Badge variant="new">Super Admin</Badge>
                          : <Badge variant="secondary">{user.staffRoleName ?? "—"}</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditTarget(user); setFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-status-danger focus:text-status-danger"
                              onClick={() => setDeleteTarget(user)}
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

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        roles={roles}
        onSubmit={handleSubmit}
      />

      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Admin User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>?
                You cannot delete your own account.
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
    </>
  );
}
