"use client";

import { useCallback, useEffect, useState } from "react";
import { userManagementApi } from "../api/userManagementApi";
import type { RolePayload, StaffRole } from "../types";

export function useRoles() {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userManagementApi.listRoles();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  async function createRole(payload: RolePayload) {
    const created = await userManagementApi.createRole(payload);
    setRoles((prev) => [...prev, created]);
    return created;
  }

  async function updateRole(id: number, payload: Partial<RolePayload>) {
    const updated = await userManagementApi.updateRole(id, payload);
    setRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }

  async function deleteRole(id: number) {
    await userManagementApi.deleteRole(id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  async function setPermissions(id: number, permissionIds: number[]) {
    const updated = await userManagementApi.setRolePermissions(id, permissionIds);
    setRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }

  return { roles, loading, error, refetch: fetchRoles, createRole, updateRole, deleteRole, setPermissions };
}
