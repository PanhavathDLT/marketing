"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Megaphone, Trophy, LogOut, Gift, Users, Layers, GitBranch, ShoppingBag, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, useStoredUser } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    label: "General",
    items: [
      { href: "/dashboard",  label: "Dashboard", icon: LayoutDashboard },
      { href: "/campaigns",  label: "Campaigns", icon: Megaphone },
      { href: "/missions",   label: "Missions",  icon: Trophy },
    ],
  },
  {
    label: "Loyalty Program",
    items: [
      { href: "/reward-store", label: "Reward",   icon: Gift },
      { href: "/redeem",       label: "Redeem",   icon: ShoppingBag },
      { href: "/referral",     label: "Referral", icon: GitBranch },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/tiers",           label: "Tiers",           icon: Layers },
      { href: "/user-management", label: "User Management", icon: Users },
      { href: "/settings",        label: "Settings",        icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStoredUser();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-20 items-center px-4">
        <Image
          src="/web_logo.png"
          alt="Luy Leun"
          width={240}
          height={80}
          className="h-12 w-auto object-contain"
          priority
        />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User footer */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-brand text-brand-foreground text-xs">
              {user ? getInitials(user.name) : "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="truncate text-xs font-medium text-sidebar-foreground">
              {user?.name ?? "Admin"}
            </span>
            <span className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
