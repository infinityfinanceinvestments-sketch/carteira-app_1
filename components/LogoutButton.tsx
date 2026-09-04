"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded-xl border border-white/20 px-2.5 py-1 text-xs font-medium text-white/90 hover:bg-white/10"
    >
      Sair
    </button>
  );
}
