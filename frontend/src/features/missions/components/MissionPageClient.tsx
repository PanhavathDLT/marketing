"use client";

import { useCallback, useEffect, useState } from "react";
import { campaignsApi } from "@/features/campaigns/api/campaignsApi";
import type { Campaign } from "@/features/campaigns/types";
import { MissionsPanel } from "./MissionsPanel";

export function MissionPageClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    const data = await campaignsApi.list();
    setCampaigns(data);
  }, []);

  useEffect(() => {
    fetchCampaigns().finally(() => setLoading(false));
  }, [fetchCampaigns]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return <MissionsPanel campaigns={campaigns} onRefresh={fetchCampaigns} />;
}
