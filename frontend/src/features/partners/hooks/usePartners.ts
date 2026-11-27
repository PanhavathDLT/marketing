import { useEffect, useState, useCallback } from "react";
import { partnersApi } from "../api/partnersApi";
import type { PartnerCode, PartnerCodePayload } from "../types";

export function usePartners() {
  const [partners, setPartners] = useState<PartnerCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(() => {
    setLoading(true);
    partnersApi
      .list()
      .then(setPartners)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load partners"))
      .finally(() => setLoading(false));
  }, []);

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
