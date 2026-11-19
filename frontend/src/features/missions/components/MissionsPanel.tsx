"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MissionTypeBadge } from "./MissionTypeBadge";
import { MissionStatusBadge } from "./MissionStatusBadge";
import { MissionFormDialog } from "./MissionFormDialog";
import { MissionDeleteDialog } from "./MissionDeleteDialog";
import { missionsApi } from "../api/missionsApi";
import type { Campaign } from "@/features/campaigns/types";
import type { Mission, MissionPayload } from "../types";

interface Props {
  campaigns: Campaign[];
  onRefresh: () => Promise<void>;
}

export function MissionsPanel({ campaigns, onRefresh }: Props) {
  const [filter, setFilter] = useState<"all" | string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Mission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mission | null>(null);

  // Enrich missions embedded in campaign response:
  // - inject campaignId (not returned by the API on embedded missions)
  // - compute status from dates if missing (backend only adds it on the standalone mission endpoints)
  function enrichMissions(campaignId: number, missions: Mission[]): Mission[] {
    const now = new Date();
    return missions.map((m) => ({
      ...m,
      campaignId,
      status: m.status ?? (
        new Date(m.startDate) > now
          ? "UPCOMING"
          : new Date(m.endDate) < now
          ? "COMPLETED"
          : "ACTIVE"
      ),
    }));
  }

  const displayedMissions: Mission[] =
    filter === "all"
      ? campaigns.flatMap((c) => enrichMissions(c.id, c.missions ?? []))
      : enrichMissions(
          Number(filter),
          campaigns.find((c) => String(c.id) === filter)?.missions ?? []
        );

  // Build a lookup for campaign name by id
  const campaignNameById = Object.fromEntries(
    campaigns.map((c) => [c.id, c.title])
  );

  async function handleSubmit(campaignId: number, payload: MissionPayload) {
    if (editTarget) {
      await missionsApi.update(editTarget.campaignId, editTarget.id, payload);
    } else {
      await missionsApi.create(campaignId, payload);
    }
    await onRefresh();
  }

  async function handleDelete(mission: Mission) {
    await missionsApi.delete(mission.campaignId, mission.id);
    await onRefresh();
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(mission: Mission) {
    setEditTarget(mission);
    setFormOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Select Campaign</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-52 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Mission
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">Icon</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Title</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Campaign</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Points</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Start Date</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">End Date</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedMissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-muted-foreground">
                      {campaigns.length === 0
                        ? "No campaigns exist yet. Create a campaign first."
                        : "No missions for this selection yet."}
                    </td>
                  </tr>
                ) : (
                  displayedMissions.map((mission) => (
                    <tr
                      key={mission.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        {mission.iconUrl ? (
                          <img
                            src={mission.iconUrl}
                            alt=""
                            className="h-8 w-8 rounded object-cover border border-border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted" />
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{mission.title}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {campaignNameById[mission.campaignId] ?? `#${mission.campaignId}`}
                      </td>
                      <td className="px-6 py-4">
                        <MissionTypeBadge type={mission.type} />
                      </td>
                      <td className="px-6 py-4">
                        <MissionStatusBadge status={mission.status} />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <span className="font-medium text-foreground">{mission.points}</span> pts
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(mission.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(mission.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(mission)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-status-danger focus:text-status-danger"
                              onClick={() => setDeleteTarget(mission)}
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

      <MissionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        campaigns={campaigns}
        onSubmit={handleSubmit}
      />

      {deleteTarget && (
        <MissionDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={deleteTarget.title}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </>
  );
}
