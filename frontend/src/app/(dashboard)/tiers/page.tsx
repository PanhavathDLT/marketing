import { TiersTable } from "@/features/tiers/components/TiersTable";

export default function TiersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tiers</h2>
        <p className="text-sm text-muted-foreground">
          Define customer loyalty tiers and their point thresholds. Changes apply system-wide.
        </p>
      </div>
      <TiersTable />
    </div>
  );
}
