"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-navy/40">
      Loading analytics…
    </div>
  ),
});

export default function DashboardLoader() {
  return <Dashboard />;
}
