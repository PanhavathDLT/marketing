"use client";

import { useCallback, useEffect, useState } from "react";
import { tiersApi } from "../api/tiersApi";
import type { Tier, TierPayload } from "../types";

export function useTiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tiersApi.list();
      setTiers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tiers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  async function createTier(payload: TierPayload) {
    const created = await tiersApi.create(payload);
    setTiers((prev) => [...prev, created].sort((a, b) => a.minPoints - b.minPoints));
    return created;
  }

  async function updateTier(id: number, payload: Partial<TierPayload>) {
    const updated = await tiersApi.update(id, payload);
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? updated : t)).sort((a, b) => a.minPoints - b.minPoints)
    );
    return updated;
  }

  async function deleteTier(id: number) {
    await tiersApi.delete(id);
    setTiers((prev) => prev.filter((t) => t.id !== id));
  }

  return { tiers, loading, error, refetch: fetchTiers, createTier, updateTier, deleteTier };
}
