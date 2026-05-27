import { DashboardView } from "@/components/DashboardView";
import { getDashboardData } from "@/lib/dashboard";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

function getCurrentMonthSelection() {
  const now = new Date();

  return {
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}) {
  const user = await requireUnlockedAppUser("/");
  const resolvedSearchParams = (await searchParams) || {};
  const currentSelection = getCurrentMonthSelection();
  const selectedMonth =
    resolvedSearchParams.month && /^\d{2}$/.test(resolvedSearchParams.month)
      ? resolvedSearchParams.month
      : currentSelection.month;
  const selectedYear =
    resolvedSearchParams.year && /^\d{4}$/.test(resolvedSearchParams.year)
      ? resolvedSearchParams.year
      : currentSelection.year;
  const selectedMonthKey = `${selectedYear}-${selectedMonth}`;
  const data = await measureServerOperation("page /.data", () =>
    getDashboardData(selectedMonthKey),
  );

  return (
    <DashboardView
      user={user}
      data={data}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  );
}
