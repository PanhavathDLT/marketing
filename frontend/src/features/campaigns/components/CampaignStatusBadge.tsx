import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "../types";

const STATUS_MAP: Record<CampaignStatus, { label: string; variant: "success" | "muted" | "warning" | "info" }> = {
  ACTIVE:    { label: "Active",    variant: "success" },
  UPCOMING:  { label: "Upcoming",  variant: "info" },
  DRAFT:     { label: "Draft",     variant: "warning" },
  COMPLETED: { label: "Completed", variant: "muted" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const entry = STATUS_MAP[status] ?? { label: status, variant: "muted" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
