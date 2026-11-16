"use client";

import { useCallback, useEffect, useState } from "react";
import { rewardStoreApi } from "../api/rewardStoreApi";
import type { Redemption, RedemptionStatus } from "../types";

export function useRedemptions() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRedemptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rewardStoreApi.listRedemptions();
      setRedemptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  async function updateStatus(id: number, status: RedemptionStatus) {
    const updated = await rewardStoreApi.updateRedemptionStatus(id, status);
    setRedemptions((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }

  return { redemptions, loading, error, refetch: fetchRedemptions, updateStatus };
}
