"use client";

import { useEffect, useState } from "react";
import { RolesTable } from "@/features/user-management/components/RolesTable";
import { userManagementApi } from "@/features/user-management/api/userManagementApi";
import type { PermissionGroup } from "@/features/user-management/types";

export default function RolesPermissionsPage() {
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);

  useEffect(() => {
    userManagementApi.listPermissions().then(setPermGroups).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage staff roles and their access permissions.</p>
      </div>
      <RolesTable permissionGroups={permGroups} />
    </div>
  );
}
