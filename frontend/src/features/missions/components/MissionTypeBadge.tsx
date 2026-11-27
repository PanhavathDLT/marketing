import { Badge } from "@/components/ui/badge";
import { getMissionLabel } from "@/lib/mission";
import type { MissionType } from "../types";

type BadgeVariant = "new" | "info" | "success" | "warning" | "secondary";

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  REFERRAL:               "new",
  APPLICATION_SUBMISSION: "info",
  LOAN_APPROVAL:          "success",
  REPAYMENT:              "warning",
  COMPLETE_FORM1:         "info",
  COMPLETE_FORM2:         "info",
  COMPLETE_FORM3:         "info",
  COMPLETE_FORM4:         "info",
};

export function MissionTypeBadge({ type }: { type: MissionType }) {
  return (
    <Badge variant={TYPE_VARIANT[type] ?? "secondary"}>
      {getMissionLabel(type)}
    </Badge>
  );
}
