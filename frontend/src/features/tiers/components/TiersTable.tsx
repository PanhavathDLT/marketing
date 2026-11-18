"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierFormDialog } from "./TierFormDialog";
import { useTiers } from "../hooks/useTiers";
import type { Tier, TierPayload } from "../types";

export function TiersTable() {
  const { tiers, loading, error, createTier, updateTier, deleteTier } = useTiers();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(payload: TierPayload) {
    if (editTarget) {
      await updateTier(editTarget.id, payload);
    } else {
      await createTier(payload);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTier(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tiers</CardTitle>
          <Button variant="brand" size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Tier
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Tier</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Min Loans</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Reward Points</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Layers className="h-6 w-6" />
                        <p className="text-sm">No tiers yet. Create your first tier.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {tier.iconUrl ? (
                            <img
                              src={tier.iconUrl}
                              alt={tier.name}
                              className="h-8 w-8 rounded object-cover border border-border"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-foreground">{tier.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {tier.minLoanCount} loans
                      </td>
                      <td className="px-6 py-4 font-semibold text-brand">
                        {tier.rewardPoints.toLocaleString()} pts
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(tier.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditTarget(tier); setFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-status-danger focus:text-status-danger"
                              onClick={() => setDeleteTarget(tier)}
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

      <TierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSubmit={handleSubmit}
      />

      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Tier</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> tier?
                Deletion is blocked if any customers are currently assigned to it.
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
