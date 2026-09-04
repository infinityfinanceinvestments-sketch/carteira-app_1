"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between gap-0.5 rounded-[24px] border border-slate-900/5 bg-white/95 px-1 py-1.5 shadow-[var(--shadow-lift)] backdrop-blur dark:border-white/10 dark:bg-[var(--color-navy-900)]/90">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "bg-gradient-to-br from-[var(--color-accent-soft)] to-white text-[var(--color-accent-dark)] dark:from-[var(--color-accent)]/25 dark:to-[var(--color-accent)]/5 dark:text-[var(--color-sky)]"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="w-full truncate px-0.5 text-center">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
