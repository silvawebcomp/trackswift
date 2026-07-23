"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace(`/index.html${window.location.hash}`);
  }, []);

  return (
    <main className="redirect-screen" aria-live="polite">
      <strong>TrackSwift</strong>
      <span>Opening secure shipment tracking…</span>
    </main>
  );
}
