"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-ink-muted text-sm tracking-wide">
      Loading…
    </div>
  ),
});

export default function Home() {
  return <Dashboard />;
}
