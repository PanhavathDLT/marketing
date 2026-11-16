"use client";

import { useState } from "react";
import { RewardStoreTable } from "@/features/reward-store/components/RewardStoreTable";
import { RedemptionsTable } from "@/features/reward-store/components/RedemptionsTable";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "items", label: "Store Items" },
  { id: "redemptions", label: "Redemptions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function RewardStorePage() {
  const [activeTab, setActiveTab] = useState<TabId>("items");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Reward Store</h2>
        <p className="text-sm text-muted-foreground">Manage redeemable items and customer redemptions</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "items" && <RewardStoreTable />}
      {activeTab === "redemptions" && <RedemptionsTable />}
    </div>
  );
}
