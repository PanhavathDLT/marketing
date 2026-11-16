"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "../hooks/useLogin";

// Fixed star positions so they don't re-randomise on render
const STARS = [
  { id: 1,  x: 8,  y: 12, s: 1.5, d: 0 },
  { id: 2,  x: 22, y: 5,  s: 1,   d: 0.6 },
  { id: 3,  x: 35, y: 20, s: 2,   d: 1.2 },
  { id: 4,  x: 48, y: 8,  s: 1,   d: 0.3 },
  { id: 5,  x: 60, y: 15, s: 1.5, d: 1.8 },
  { id: 6,  x: 75, y: 4,  s: 1,   d: 0.9 },
  { id: 7,  x: 88, y: 18, s: 2,   d: 2.4 },
  { id: 8,  x: 14, y: 35, s: 1,   d: 1.5 },
  { id: 9,  x: 28, y: 42, s: 1.5, d: 0.4 },
  { id: 10, x: 55, y: 38, s: 1,   d: 2.1 },
  { id: 11, x: 70, y: 30, s: 2,   d: 0.7 },
  { id: 12, x: 82, y: 45, s: 1,   d: 1.3 },
  { id: 13, x: 92, y: 35, s: 1.5, d: 2.8 },
  { id: 14, x: 6,  y: 60, s: 1,   d: 0.2 },
  { id: 15, x: 18, y: 70, s: 2,   d: 1.7 },
  { id: 16, x: 42, y: 65, s: 1,   d: 0.8 },
  { id: 17, x: 65, y: 58, s: 1.5, d: 2.3 },
  { id: 18, x: 78, y: 72, s: 1,   d: 0.5 },
  { id: 19, x: 90, y: 62, s: 2,   d: 1.9 },
  { id: 20, x: 10, y: 82, s: 1,   d: 1.1 },
  { id: 21, x: 30, y: 88, s: 1.5, d: 2.6 },
  { id: 22, x: 50, y: 80, s: 1,   d: 0.1 },
  { id: 23, x: 68, y: 85, s: 2,   d: 1.4 },
  { id: 24, x: 85, y: 90, s: 1,   d: 2.0 },
  { id: 25, x: 95, y: 78, s: 1.5, d: 0.6 },
  { id: 26, x: 38, y: 52, s: 1,   d: 1.6 },
  { id: 27, x: 52, y: 48, s: 2,   d: 2.2 },
  { id: 28, x: 20, y: 25, s: 1,   d: 0.9 },
  { id: 29, x: 72, y: 22, s: 1.5, d: 1.0 },
  { id: 30, x: 45, y: 92, s: 1,   d: 2.5 },
];

const PLANETS = [
  { r: 90,  dur: "7s",  size: 10, color: "#60a5fa", glow: "rgba(96,165,250,0.7)",  name: "Government" },
  { r: 145, dur: "14s", size: 14, color: "#f97316", glow: "rgba(249,115,22,0.7)",  name: "Investor"   },
  { r: 200, dur: "24s", size: 11, color: "#2dd4bf", glow: "rgba(45,212,191,0.7)",  name: "Partner"    },
  { r: 262, dur: "38s", size: 17, color: "#fbbf24", glow: "rgba(251,191,36,0.7)",  name: "Employee"   },
];

export function LoginForm() {
  const { login, loading, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login({ email, password });
  }

  return (
    <div className="flex min-h-screen">
      <style>{`
        @keyframes solar-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes solar-orbit-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes sun-glow {
          0%, 100% { box-shadow: 0 0 24px 10px rgba(251,191,36,0.45), 0 0 60px 24px rgba(251,146,60,0.2); }
          50% { box-shadow: 0 0 40px 16px rgba(251,191,36,0.65), 0 0 90px 36px rgba(251,146,60,0.3); }
        }
        @keyframes star-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
      `}</style>
      {/* ── Left panel — solar system ── */}
      <div
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden"
        style={{ background: "#060d1f" }}
      >
        {/* Stars */}
        {STARS.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s,
              animation: `star-twinkle ${2 + s.d}s ease-in-out infinite`,
              animationDelay: `${s.d}s`,
            }}
          />
        ))}

        {/* Solar system */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Orbit rings + planets */}
          {PLANETS.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.r * 2,
                height: p.r * 2,
                top: "50%",
                left: "50%",
                marginTop: -p.r,
                marginLeft: -p.r,
                border: "1px solid rgba(255,255,255,0.08)",
                animation: `solar-orbit ${p.dur} linear infinite`,
              }}
            >
              {/* Counter-rotating planet + label */}
              <div
                className="absolute flex flex-col items-center gap-1"
                style={{
                  width: 80,
                  top: -p.size / 2,
                  left: "50%",
                  marginLeft: -40,
                  animation: `solar-orbit-reverse ${p.dur} linear infinite`,
                  transformOrigin: `40px ${p.r + p.size / 2}px`,
                }}
              >
                {/* Planet dot */}
                <div
                  className="rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    background: p.color,
                    boxShadow: `0 0 10px 3px ${p.glow}`,
                  }}
                />
                {/* Label */}
                <span
                  style={{
                    color: p.color,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                    textShadow: `0 0 8px ${p.glow}`,
                  }}
                >
                  {p.name}
                </span>
              </div>
            </div>
          ))}

          {/* Sun */}
          <div
            className="absolute rounded-full z-10"
            style={{
              width: 56,
              height: 56,
              background: "radial-gradient(circle at 35% 35%, #fef08a, #f97316)",
              animation: "sun-glow 3s ease-in-out infinite",
            }}
          />
        </div>

      </div>

      {/* Divider */}
      <div className="hidden lg:block w-px bg-border" />

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Marketing Admin Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your admin account</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="rounded-md bg-status-danger-bg px-3 py-2 text-xs text-status-danger">
                  {error}
                </p>
              )}

              <Button type="submit" variant="brand" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>

          {/* Logo below form */}
          <div className="mt-8 flex justify-center">
            <Image
              src="/web_logo.png"
              alt="LuyLeun"
              width={320}
              height={90}
              className="w-40 object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
