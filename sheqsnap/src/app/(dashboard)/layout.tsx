import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getLicenseModules } from "@/lib/license";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const license = await getLicenseModules();
  return <DashboardLayout initialModules={license.modules}>{children}</DashboardLayout>;
}
