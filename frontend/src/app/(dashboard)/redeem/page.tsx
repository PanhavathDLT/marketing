import { RedemptionsTable } from "@/features/reward-store/components/RedemptionsTable";

export default function RedeemPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Redemptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track and manage customer reward redemptions.</p>
      </div>
      <RedemptionsTable />
    </div>
  );
}
