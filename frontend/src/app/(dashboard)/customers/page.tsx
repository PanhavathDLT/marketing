import { CustomersTable } from "@/features/customers/components/CustomersTable";

export default function CustomersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">All registered customer profiles.</p>
      </div>
      <CustomersTable />
    </div>
  );
}
