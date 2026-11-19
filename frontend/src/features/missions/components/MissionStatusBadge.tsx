import { Badge } from "@/components/ui/badge";
import type { MissionStatus } from "../types";

const STATUS_MAP: Record<MissionStatus, { label: string; variant: "success" | "info" | "secondary" }> = {
  ACTIVE:    { label: "Active",    variant: "success" },
  UPCOMING:  { label: "Upcoming",  variant: "info" },
  COMPLETED: { label: "Completed", variant: "secondary" },
};

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const entry = STATUS_MAP[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
