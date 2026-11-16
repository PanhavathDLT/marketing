"use client";

import { useCallback, useEffect, useState } from "react";
import { rewardStoreApi } from "../api/rewardStoreApi";
import type { RewardItem, RewardItemPayload } from "../types";

export function useRewardStore() {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rewardStoreApi.list();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reward items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function createItem(payload: RewardItemPayload) {
    const created = await rewardStoreApi.create(payload);
    setItems((prev) => [created, ...prev]);
    return created;
  }

  async function updateItem(id: number, payload: Partial<RewardItemPayload>) {
    const updated = await rewardStoreApi.update(id, payload);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  }

  async function deleteItem(id: number) {
    await rewardStoreApi.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return { items, loading, error, refetch: fetchItems, createItem, updateItem, deleteItem };
}
