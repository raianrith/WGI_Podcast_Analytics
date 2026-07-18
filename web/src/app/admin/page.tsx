"use client";

import dynamic from "next/dynamic";

const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-ink-muted">Loading…</div>
  ),
});

export default function AdminPage() {
  return <AdminPanel />;
}
