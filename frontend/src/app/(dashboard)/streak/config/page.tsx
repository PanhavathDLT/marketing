import { CheckInConfigCard } from "@/features/streak/components/CheckInConfigCard";

export default function CheckInConfigPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Check-in Config</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the points awarded for each day of the 7-day check-in streak cycle.
        </p>
      </div>
      <CheckInConfigCard />
    </div>
  );
}
