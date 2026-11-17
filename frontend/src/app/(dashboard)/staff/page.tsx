"use client";

import { useEffect, useState } from "react";
import { AdminUsersTable } from "@/features/user-management/components/AdminUsersTable";
import { userManagementApi } from "@/features/user-management/api/userManagementApi";
import type { StaffRole } from "@/features/user-management/types";

export default function StaffPage() {
  const [roles, setRoles] = useState<StaffRole[]>([]);

  useEffect(() => {
    userManagementApi.listRoles().then(setRoles).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Staff</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage admin staff accounts and their roles.</p>
      </div>
      <AdminUsersTable roles={roles} />
    </div>
  );
}
