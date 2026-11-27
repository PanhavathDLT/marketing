import { PartnersTable } from "@/features/partners/components/PartnersTable";

export default function PartnersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage content creators and track their code usage and loan conversions.
        </p>
      </div>
      <PartnersTable />
    </div>
  );
}
