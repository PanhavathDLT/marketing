import { Badge } from "@/components/ui/badge";
import type { MissionType } from "../types";

type BadgeVariant = "new" | "info" | "success" | "warning" | "secondary";

const TYPE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  REFERRAL:               { label: "Referral",               variant: "new"     },
  APPLICATION_SUBMISSION: { label: "Application Submission", variant: "info"    },
  LOAN_APPROVAL:          { label: "Loan Approval",          variant: "success" },
  REPAYMENT:              { label: "Repayment",              variant: "warning" },
  COMPLETE_FORM1:         { label: "Complete Form 1",        variant: "info"    },
  COMPLETE_FORM2:         { label: "Complete Form 2",        variant: "info"    },
  COMPLETE_FORM3:         { label: "Complete Form 3",        variant: "info"    },
  COMPLETE_FORM4:         { label: "Complete Form 4",        variant: "info"    },
};

function formatLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function MissionTypeBadge({ type }: { type: MissionType }) {
  const entry = TYPE_MAP[type];
  if (entry) return <Badge variant={entry.variant}>{entry.label}</Badge>;
  return <Badge variant="secondary">{formatLabel(type)}</Badge>;
}
