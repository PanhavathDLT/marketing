import { CheckInCustomersTable } from "@/features/streak/components/CheckInCustomersTable";

export default function CheckInCustomersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Customer Streaks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers who have checked in, ordered by most recent activity.
        </p>
      </div>
      <CheckInCustomersTable />
    </div>
  );
}
