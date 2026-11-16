"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RewardStoreFormDialog } from "./RewardStoreFormDialog";
import { useRewardStore } from "../hooks/useRewardStore";
import type { RewardItem, RewardItemPayload } from "../types";

export function RewardStoreTable() {
  const { items, loading, error, createItem, updateItem, deleteItem } = useRewardStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RewardItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RewardItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(payload: RewardItemPayload) {
    if (editTarget) {
      await updateItem(editTarget.id, payload);
    } else {
      await createItem(payload);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteItem(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Page header row */}
      <div className="flex items-center justify-between">
        <div />
        <Button variant="brand" size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Item
        </Button>
      </div>

      {error && <p className="text-sm text-status-danger">{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card animate-pulse">
              <div className="h-44 w-full rounded-t-xl bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
          <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No reward items yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create your first item to get started</p>
        </div>
      )}

      {/* Card grid */}
      {!loading && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {/* Image */}
              <div className="relative h-44 w-full bg-muted">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                {/* Status badge overlaid on image */}
                <div className="absolute left-2 top-2">
                  <Badge variant={item.isActive ? "success" : "muted"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {/* Actions menu overlaid on image */}
                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-card/80 backdrop-blur-sm hover:bg-card"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditTarget(item); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-status-danger focus:text-status-danger"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info */}
              <CardContent className="p-4">
                <p className="truncate font-medium text-foreground">{item.title}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand">
                    {item.points.toLocaleString()} pts
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.stock} in stock
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RewardStoreFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSubmit={handleSubmit}
      />

      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Reward Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>?
                This cannot be undone.
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
