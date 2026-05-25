import { DashboardView } from "@/components/DashboardView";
import { getDashboardData } from "@/lib/dashboard";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUnlockedAppUser("/");
  const data = await getDashboardData();

  return <DashboardView user={user} data={data} />;
}
