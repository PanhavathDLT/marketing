import { ReferralsTable } from "@/features/referral/components/ReferralsTable";

export default function ReferralPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All referral relationships — who referred whom and when.
        </p>
      </div>
      <ReferralsTable />
    </div>
  );
}
