"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, PowerOff, Plus, Users, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerFormDialog } from "./PartnerFormDialog";
import { PartnerUsagesDialog } from "./PartnerUsagesDialog";
import { usePartners } from "../hooks/usePartners";
import type { PartnerCode, PartnerCodePayload } from "../types";

const CHANNEL_LABELS: Record<string, string> = {
  TIKTOK:    "TikTok",
  YOUTUBE:   "YouTube",
  FACEBOOK:  "Facebook",
  INSTAGRAM: "Instagram",
  TELEGRAM:  "Telegram",
  TWITTER:   "Twitter / X",
  LINKEDIN:  "LinkedIn",
  OTHER:     "Other",
};

function getChannelLabel(value: string | null): string {
  if (!value) return "—";
  return CHANNEL_LABELS[value] ?? value;
}

export function PartnersTable() {
  const { partners, loading, error, createPartner, updatePartner, deletePartner } = usePartners();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PartnerCode | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PartnerCode | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(payload: PartnerCodePayload) {
    if (editTarget) {
      await updatePartner(editTarget.id, payload);
    } else {
      const created = await createPartner(payload);
      setNewCode(created.code);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deletePartner(deactivateTarget.id);
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Content Creators</CardTitle>
          <Button
            variant="brand"
            size="sm"
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Add Creator
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-6 py-4 text-sm text-status-danger">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Creator</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Usages</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Conversions</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-6 w-6" />
                        <p className="text-sm">No creators yet. Add your first content creator.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  partners.map((partner) => (
                    <tr
                      key={partner.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{partner.name}</div>
                        {partner.phone && (
                          <div className="text-xs text-muted-foreground">{partner.phone}</div>
                        )}
                        {partner.note && (
                          <div className="text-xs text-muted-foreground italic">{partner.note}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {getChannelLabel(partner.channel)}
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                          {partner.code}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={partner.isActive ? "success" : "secondary"}>
                          {partner.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setViewingId(partner.id)}
                          className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
                        >
                          {partner.totalUsages}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {partner.totalConversions}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(partner.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingId(partner.id)}>
                              <Users className="h-4 w-4" />
                              View Usages
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditTarget(partner); setFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {partner.isActive && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-status-danger focus:text-status-danger"
                                  onClick={() => setDeactivateTarget(partner)}
                                >
                                  <PowerOff className="h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              </>
                            )}
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

      <PartnerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSubmit={handleSubmit}
      />

      <PartnerUsagesDialog
        partnerId={viewingId}
        onClose={() => setViewingId(null)}
      />

      {/* New code reveal dialog */}
      <Dialog open={!!newCode} onOpenChange={(o) => !o && setNewCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Creator Added</DialogTitle>
            <DialogDescription>
              Copy this code and share it with the creator. It cannot be changed later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <code className="block rounded-lg bg-muted px-6 py-4 text-2xl font-mono font-bold tracking-widest text-foreground">
              {newCode}
            </code>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => newCode && copyCode(newCode)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Code"}
            </Button>
            <Button variant="brand" className="flex-1" onClick={() => setNewCode(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      {deactivateTarget && (
        <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Deactivate Creator</DialogTitle>
              <DialogDescription>
                Are you sure you want to deactivate <strong>&ldquo;{deactivateTarget.name}&rdquo;</strong>?
                Their code will stop working for new sign-ups. Existing usage data is kept.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeactivate} disabled={deactivating}>
                {deactivating ? "Deactivating…" : "Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
