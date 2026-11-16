"use client";

import { useEffect, useState } from "react";
import { userManagementApi } from "../api/userManagementApi";
import { AdminUsersTable } from "./AdminUsersTable";
import { RolesTable } from "./RolesTable";
import { Button } from "@/components/ui/button";
import type { PermissionGroup, StaffRole } from "../types";

type Tab = "users" | "roles";

export function UserManagementPanel() {
  const [tab, setTab] = useState<Tab>("users");
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);

  useEffect(() => {
    // Preload roles + permissions for user form dropdowns and permission matrix
    userManagementApi.listRoles().then(setRoles).catch(() => {});
    userManagementApi.listPermissions().then(setPermGroups).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
        {(["users", "roles"] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(t)}
            className={tab === t ? "bg-card shadow-sm" : ""}
          >
            {t === "users" ? "Admin Users" : "Roles & Permissions"}
          </Button>
        ))}
      </div>

      {tab === "users" && <AdminUsersTable roles={roles} />}
      {tab === "roles" && <RolesTable permissionGroups={permGroups} />}
    </div>
  );
}
