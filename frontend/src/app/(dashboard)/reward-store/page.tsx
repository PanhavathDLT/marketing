import { RewardStoreTable } from "@/features/reward-store/components/RewardStoreTable";

export default function RewardStorePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reward Store</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage redeemable items in the store.</p>
      </div>
      <RewardStoreTable />
    </div>
  );
}
