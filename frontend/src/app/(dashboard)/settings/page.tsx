import { ReferralSettingsCard } from "@/features/settings/components/ReferralSettingsCard";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure global behaviour for the loyalty program.</p>
      </div>
      <ReferralSettingsCard />
    </div>
  );
}
