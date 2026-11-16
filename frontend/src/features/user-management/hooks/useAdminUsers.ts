"use client";

import { useCallback, useEffect, useState } from "react";
import { userManagementApi } from "../api/userManagementApi";
import type { AdminUser, AdminUserPayload } from "../types";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userManagementApi.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function createUser(payload: AdminUserPayload) {
    const created = await userManagementApi.createUser(payload);
    setUsers((prev) => [created, ...prev]);
    return created;
  }

  async function updateUser(id: number, payload: Partial<AdminUserPayload>) {
    const updated = await userManagementApi.updateUser(id, payload);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  }

  async function deleteUser(id: number) {
    await userManagementApi.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return { users, loading, error, refetch: fetchUsers, createUser, updateUser, deleteUser };
}
