"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type MonthOption = {
  value: string;
  label: string;
};

export function BudgetLiteMonthPicker({
  options,
  selectedMonth,
}: {
  options: MonthOption[];
  selectedMonth: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateMonth = (nextMonth: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("month", nextMonth);

    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`, {
        scroll: false,
      });
    });
  };

  return (
    <label className="mt-4 block">
      <span className="text-xs font-medium text-zinc-400">Month</span>
      <select
        value={selectedMonth}
        onChange={(event) => updateMonth(event.target.value)}
        disabled={isPending}
        className="mt-2 h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-400 disabled:cursor-wait disabled:opacity-70"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
