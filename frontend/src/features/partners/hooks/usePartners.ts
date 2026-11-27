import { useEffect, useState, useCallback } from "react";
import { partnersApi } from "../api/partnersApi";
import type { PartnerCode, PartnerCodePayload } from "../types";

export type PartnerFilter = "active" | "inactive" | "all";

export function usePartners(filter: PartnerFilter = "active") {
  const [partners, setPartners] = useState<PartnerCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isActiveParam =
    filter === "active" ? true : filter === "inactive" ? false : undefined;

  const fetchPartners = useCallback(() => {
    setLoading(true);
    partnersApi
      .list(isActiveParam)
      .then(setPartners)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load partners"))
      .finally(() => setLoading(false));
  }, [isActiveParam]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  async function createPartner(payload: PartnerCodePayload): Promise<PartnerCode> {
    const created = await partnersApi.create(payload);
    setPartners((prev) => [created, ...prev]);
    return created;
  }

  async function updatePartner(id: number, payload: PartnerCodePayload) {
    const updated = await partnersApi.update(id, payload);
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  }

  async function deletePartner(id: number) {
    await partnersApi.delete(id);
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  return { partners, loading, error, createPartner, updatePartner, deletePartner, refetch: fetchPartners };
}
