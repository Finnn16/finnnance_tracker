"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AppLockButton() {
  const router = useRouter();
  const [isLocking, setIsLocking] = useState(false);

  const lockApp = async () => {
    setIsLocking(true);

    try {
      await fetch("/api/security/pin/lock", { method: "POST" });
    } finally {
      router.replace("/unlock");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={lockApp}
      disabled={isLocking}
      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLocking ? "Locking..." : "Lock"}
    </button>
  );
}
