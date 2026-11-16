import { UserManagementPanel } from "@/features/user-management/components/UserManagementPanel";

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">User Management</h2>
        <p className="text-sm text-muted-foreground">Manage admin users, roles and permissions</p>
      </div>
      <UserManagementPanel />
    </div>
  );
}
